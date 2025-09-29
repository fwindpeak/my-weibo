package main

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var emailRegex = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"message": "Good!"})
}

type userLoginRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Server) handleUserLogin(w http.ResponseWriter, r *http.Request) {
	var req userLoginRequest
	if err := bindJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "请求格式错误")
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	password := strings.TrimSpace(req.Password)
	username := strings.TrimSpace(req.Username)

	if email == "" || password == "" {
		respondError(w, http.StatusBadRequest, "邮箱和密码不能为空")
		return
	}

	var user User
	err := s.db.Where("email = ?", email).First(&user).Error
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		if username != "" {
			var existing User
			if err := s.db.Where("username = ?", username).First(&existing).Error; err == nil {
				respondError(w, http.StatusConflict, "用户名已被占用")
				return
			} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				respondError(w, http.StatusInternalServerError, "登录失败")
				return
			}
		}

		hashed, err := hashPassword(password)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "登录失败")
			return
		}

		if username == "" {
			username = strings.Split(email, "@")[0]
		}

		user = User{
			Username: username,
			Email:    email,
			Password: &hashed,
			IsAdmin:  false,
		}
		if err := s.db.Create(&user).Error; err != nil {
			respondError(w, http.StatusInternalServerError, "登录失败")
			return
		}

		if err := s.createSession(w, user.ID); err != nil {
			respondError(w, http.StatusInternalServerError, "登录失败")
			return
		}

		respondJSON(w, http.StatusCreated, toUserResponse(user))
		return

	case err != nil:
		respondError(w, http.StatusInternalServerError, "登录失败")
		return
	}

	if user.IsAdmin {
		respondError(w, http.StatusForbidden, "请使用管理员登录入口")
		return
	}

	if user.Password == nil {
		hashed, err := hashPassword(password)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "登录失败")
			return
		}

		updates := map[string]any{
			"password": hashed,
		}

		if username != "" {
			var existing User
			if err := s.db.Where("username = ? AND id <> ?", username, user.ID).First(&existing).Error; err == nil {
				respondError(w, http.StatusConflict, "用户名已被占用")
				return
			} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				respondError(w, http.StatusInternalServerError, "登录失败")
				return
			}
			updates["username"] = username
			user.Username = username
		}

		if err := s.db.Model(&user).Updates(updates).Error; err != nil {
			respondError(w, http.StatusInternalServerError, "登录失败")
			return
		}
		user.Password = &hashed
	} else {
		match, err := verifyPassword(password, *user.Password)
		if err != nil || !match {
			respondError(w, http.StatusUnauthorized, "邮箱或密码不正确")
			return
		}

		if username != "" && username != user.Username {
			var existing User
			if err := s.db.Where("username = ? AND id <> ?", username, user.ID).First(&existing).Error; err == nil {
				respondError(w, http.StatusConflict, "用户名已被占用")
				return
			} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				respondError(w, http.StatusInternalServerError, "登录失败")
				return
			}

			if err := s.db.Model(&user).Update("username", username).Error; err != nil {
				respondError(w, http.StatusInternalServerError, "登录失败")
				return
			}
			user.Username = username
		}
	}

	if err := s.createSession(w, user.ID); err != nil {
		respondError(w, http.StatusInternalServerError, "登录失败")
		return
	}

	respondJSON(w, http.StatusOK, toUserResponse(user))
}

type adminLoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (s *Server) handleAdminLogin(w http.ResponseWriter, r *http.Request) {
	var req adminLoginRequest
	if err := bindJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "请求格式错误")
		return
	}

	username := strings.TrimSpace(req.Username)
	password := strings.TrimSpace(req.Password)

	if username == "" || password == "" {
		respondError(w, http.StatusBadRequest, "用户名和密码不能为空")
		return
	}

	var user User
	if err := s.db.Where("username = ? AND is_admin = ?", username, true).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			respondError(w, http.StatusUnauthorized, "管理员用户不存在")
			return
		}
		respondError(w, http.StatusInternalServerError, "登录失败")
		return
	}

	if user.Password == nil {
		respondError(w, http.StatusInternalServerError, "管理员密码未设置")
		return
	}

	match, err := verifyPassword(password, *user.Password)
	if err != nil || !match {
		respondError(w, http.StatusUnauthorized, "密码错误")
		return
	}

	if err := s.createSession(w, user.ID); err != nil {
		respondError(w, http.StatusInternalServerError, "登录失败")
		return
	}

	respondJSON(w, http.StatusOK, toUserResponse(user))
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if err := s.clearSession(w, r); err != nil {
		respondError(w, http.StatusInternalServerError, "退出失败")
		return
	}
	respondJSON(w, http.StatusOK, map[string]bool{"success": true})
}

func (s *Server) handleSession(w http.ResponseWriter, r *http.Request) {
	user, err := s.getSessionUser(r)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "会话获取失败")
		return
	}
	if user == nil {
		respondJSON(w, http.StatusOK, map[string]any{"user": nil})
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"user": toUserResponse(*user)})
}

func (s *Server) handleListMicroblogs(w http.ResponseWriter, r *http.Request) {
	search := strings.TrimSpace(r.URL.Query().Get("search"))

	query := s.db.Preload("User").
		Preload("Images", func(db *gorm.DB) *gorm.DB { return db.Order("created_at ASC") }).
		Preload("Likes").
		Preload("Comments", func(db *gorm.DB) *gorm.DB { return db.Preload("User").Order("created_at ASC") }).
		Order("created_at DESC")

	if search != "" {
		like := fmt.Sprintf("%%%s%%", search)
		query = query.Where("content LIKE ?", like)
	}

	var microblogs []Microblog
	if err := query.Find(&microblogs).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "获取微博失败")
		return
	}

	responses := make([]MicroblogResponse, 0, len(microblogs))
	for _, microblog := range microblogs {
		responses = append(responses, toMicroblogResponse(microblog))
	}

	respondJSON(w, http.StatusOK, responses)
}

type createMicroblogRequest struct {
	Content string `json:"content"`
	Images  []struct {
		URL     string  `json:"url"`
		AltText *string `json:"altText"`
	} `json:"images"`
}

func (s *Server) handleCreateMicroblog(w http.ResponseWriter, r *http.Request) {
	user, err := s.getSessionUser(r)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "用户验证失败")
		return
	}
	if user == nil {
		respondError(w, http.StatusUnauthorized, "需要登录后才能发布微博")
		return
	}
	if !user.IsAdmin {
		respondError(w, http.StatusForbidden, "只有管理员可以创建微博")
		return
	}

	var req createMicroblogRequest
	if err := bindJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "请求格式错误")
		return
	}

	content := strings.TrimSpace(req.Content)
	if content == "" && len(req.Images) == 0 {
		respondError(w, http.StatusBadRequest, "内容或图片至少需要一项")
		return
	}

	microblog := Microblog{
		Content: content,
		UserID:  user.ID,
	}

	for _, image := range req.Images {
		url := strings.TrimSpace(image.URL)
		if url == "" {
			continue
		}
		var alt *string
		if image.AltText != nil {
			trimmed := strings.TrimSpace(*image.AltText)
			if trimmed != "" {
				altCopy := trimmed
				alt = &altCopy
			}
		}
		microblog.Images = append(microblog.Images, Image{URL: url, AltText: alt})
	}

	if err := s.db.Create(&microblog).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "创建微博失败")
		return
	}

	loaded, err := s.preloadMicroblog(microblog.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "加载微博失败")
		return
	}

	respondJSON(w, http.StatusCreated, toMicroblogResponse(loaded))
}

type updateMicroblogRequest struct {
	Content   string `json:"content"`
	NewImages []struct {
		URL     string  `json:"url"`
		AltText *string `json:"altText"`
	} `json:"newImages"`
	DeletedImageIDs []string `json:"deletedImageIds"`
}

func (s *Server) handleUpdateMicroblog(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		respondError(w, http.StatusBadRequest, "缺少微博ID")
		return
	}

	user, err := s.getSessionUser(r)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "用户验证失败")
		return
	}
	if user == nil {
		respondError(w, http.StatusUnauthorized, "需要登录后才能编辑微博")
		return
	}

	var existing Microblog
	if err := s.db.First(&existing, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			respondError(w, http.StatusNotFound, "微博不存在")
			return
		}
		respondError(w, http.StatusInternalServerError, "加载微博失败")
		return
	}

	if !user.IsAdmin && existing.UserID != user.ID {
		respondError(w, http.StatusForbidden, "仅能编辑自己的微博")
		return
	}

	var req updateMicroblogRequest
	if err := bindJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "请求格式错误")
		return
	}

	content := strings.TrimSpace(req.Content)
	if content == "" {
		respondError(w, http.StatusBadRequest, "内容不能为空")
		return
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if len(req.DeletedImageIDs) > 0 {
			if err := tx.Where("microblog_id = ? AND id IN ?", id, req.DeletedImageIDs).Delete(&Image{}).Error; err != nil {
				return err
			}
		}

		if len(req.NewImages) > 0 {
			images := make([]Image, 0, len(req.NewImages))
			for _, img := range req.NewImages {
				url := strings.TrimSpace(img.URL)
				if url == "" {
					continue
				}
				var alt *string
				if img.AltText != nil {
					trimmed := strings.TrimSpace(*img.AltText)
					if trimmed != "" {
						altCopy := trimmed
						alt = &altCopy
					}
				}
				images = append(images, Image{URL: url, AltText: alt, MicroblogID: id})
			}
			if len(images) > 0 {
				if err := tx.Create(&images).Error; err != nil {
					return err
				}
			}
		}

		return tx.Model(&Microblog{}).Where("id = ?", id).Updates(map[string]any{
			"content":    content,
			"updated_at": time.Now(),
		}).Error
	})

	if err != nil {
		respondError(w, http.StatusInternalServerError, "更新微博失败")
		return
	}

	loaded, err := s.preloadMicroblog(id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "加载微博失败")
		return
	}

	respondJSON(w, http.StatusOK, toMicroblogResponse(loaded))
}

func (s *Server) handleDeleteMicroblog(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		respondError(w, http.StatusBadRequest, "缺少微博ID")
		return
	}

	user, err := s.getSessionUser(r)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "用户验证失败")
		return
	}
	if user == nil {
		respondError(w, http.StatusUnauthorized, "需要登录后才能删除微博")
		return
	}

	if err := s.db.First(&Microblog{}, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			respondError(w, http.StatusNotFound, "微博不存在")
			return
		}
		respondError(w, http.StatusInternalServerError, "加载微博失败")
		return
	}

	if !user.IsAdmin && microblog.UserID != user.ID {
		respondError(w, http.StatusForbidden, "仅能删除自己的微博")
		return
	}

	if err := s.db.Delete(&Microblog{}, "id = ?", id).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "删除微博失败")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Microblog deleted successfully"})
}

func (s *Server) handleLikeMicroblog(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		respondError(w, http.StatusBadRequest, "缺少微博ID")
		return
	}

	user, err := s.getSessionUser(r)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "用户验证失败")
		return
	}
	if user == nil {
		respondError(w, http.StatusUnauthorized, "需要登录后才能点赞")
		return
	}

	if err := s.db.First(&Microblog{}, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			respondError(w, http.StatusNotFound, "微博不存在")
			return
		}
		respondError(w, http.StatusInternalServerError, "加载微博失败")
		return
	}

	var like Like
	if err := s.db.Where("microblog_id = ? AND user_id = ?", id, user.ID).First(&like).Error; err == nil {
		if err := s.db.Delete(&Like{}, "id = ?", like.ID).Error; err != nil {
			respondError(w, http.StatusInternalServerError, "取消点赞失败")
			return
		}
		respondJSON(w, http.StatusOK, map[string]any{"liked": false})
		return
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		respondError(w, http.StatusInternalServerError, "加载点赞状态失败")
		return
	}

	like = Like{
		MicroblogID: id,
		UserID:      user.ID,
	}
	if err := s.db.Create(&like).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "点赞失败")
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{"liked": true, "like": toLikeResponse(like)})
}

func (s *Server) handleClearLikes(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		respondError(w, http.StatusBadRequest, "缺少微博ID")
		return
	}

	user, err := s.getSessionUser(r)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "用户验证失败")
		return
	}
	if user == nil {
		respondError(w, http.StatusUnauthorized, "需要登录")
		return
	}
	if !user.IsAdmin {
		respondError(w, http.StatusForbidden, "仅管理员可清空点赞")
		return
	}

	if err := s.db.Where("microblog_id = ?", id).Delete(&Like{}).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "清空点赞失败")
		return
	}

	respondJSON(w, http.StatusOK, map[string]bool{"success": true})
}

func (s *Server) handleListComments(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		respondError(w, http.StatusBadRequest, "缺少微博ID")
		return
	}

	if err := s.db.First(&Microblog{}, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			respondError(w, http.StatusNotFound, "微博不存在")
			return
		}
		respondError(w, http.StatusInternalServerError, "加载微博失败")
		return
	}

	var comments []Comment
	if err := s.db.Preload("User").Where("microblog_id = ?", id).Order("created_at DESC").Find(&comments).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "获取评论失败")
		return
	}

	responses := make([]CommentResponse, 0, len(comments))
	for _, comment := range comments {
		responses = append(responses, toCommentResponse(comment))
	}

	respondJSON(w, http.StatusOK, responses)
}

type createCommentRequest struct {
	Content    string `json:"content"`
	GuestName  string `json:"guestName"`
	GuestEmail string `json:"guestEmail"`
}

func (s *Server) handleCreateComment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		respondError(w, http.StatusBadRequest, "缺少微博ID")
		return
	}

	user, err := s.getSessionUser(r)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "用户验证失败")
		return
	}

	var req createCommentRequest
	if err := bindJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "请求格式错误")
		return
	}

	content := strings.TrimSpace(req.Content)
	if content == "" {
		respondError(w, http.StatusBadRequest, "内容不能为空")
		return
	}

	if err := s.db.First(&Microblog{}, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			respondError(w, http.StatusNotFound, "微博不存在")
			return
		}
		respondError(w, http.StatusInternalServerError, "加载微博失败")
		return
	}

	var userID *string
	var guestName *string
	var guestEmail *string

	if user != nil {
		userID = &user.ID
	} else {
		name := strings.TrimSpace(req.GuestName)
		email := strings.TrimSpace(strings.ToLower(req.GuestEmail))
		if name == "" || email == "" {
			respondError(w, http.StatusBadRequest, "游客评论需要提供昵称和邮箱")
			return
		}
		if !emailRegex.MatchString(email) {
			respondError(w, http.StatusBadRequest, "邮箱格式不正确")
			return
		}
		nameCopy := name
		emailCopy := email
		guestName = &nameCopy
		guestEmail = &emailCopy
	}

	comment := Comment{
		Content:     content,
		MicroblogID: id,
		UserID:      userID,
		GuestName:   guestName,
		GuestEmail:  guestEmail,
	}

	if err := s.db.Create(&comment).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "创建评论失败")
		return
	}

	if err := s.db.Preload("User").First(&comment, "id = ?", comment.ID).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "加载评论失败")
		return
	}

	respondJSON(w, http.StatusCreated, toCommentResponse(comment))
}

func (s *Server) handleUpdateComment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		respondError(w, http.StatusBadRequest, "缺少评论ID")
		return
	}

	user, err := s.getSessionUser(r)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "用户验证失败")
		return
	}
	if user == nil {
		respondError(w, http.StatusUnauthorized, "需要登录后才能编辑评论")
		return
	}

	var req struct {
		Content string `json:"content"`
	}
	if err := bindJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "请求格式错误")
		return
	}

	content := strings.TrimSpace(req.Content)
	if content == "" {
		respondError(w, http.StatusBadRequest, "内容不能为空")
		return
	}

	var comment Comment
	if err := s.db.Preload("User").First(&comment, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			respondError(w, http.StatusNotFound, "评论不存在")
			return
		}
		respondError(w, http.StatusInternalServerError, "加载评论失败")
		return
	}

	if !user.IsAdmin {
		if comment.UserID == nil || *comment.UserID != user.ID {
			respondError(w, http.StatusForbidden, "仅能编辑自己的评论")
			return
		}
	}

	if err := s.db.Model(&comment).Update("content", content).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "更新评论失败")
		return
	}

	if err := s.db.Preload("User").First(&comment, "id = ?", id).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "加载评论失败")
		return
	}

	respondJSON(w, http.StatusOK, toCommentResponse(comment))
}

func (s *Server) handleDeleteComment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		respondError(w, http.StatusBadRequest, "缺少评论ID")
		return
	}

	user, err := s.getSessionUser(r)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "用户验证失败")
		return
	}
	if user == nil {
		respondError(w, http.StatusUnauthorized, "需要登录后才能删除评论")
		return
	}

	var comment Comment
	if err := s.db.First(&comment, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			respondError(w, http.StatusNotFound, "评论不存在")
			return
		}
		respondError(w, http.StatusInternalServerError, "加载评论失败")
		return
	}

	if !user.IsAdmin {
		if comment.UserID == nil || *comment.UserID != user.ID {
			respondError(w, http.StatusForbidden, "仅能删除自己的评论")
			return
		}
	}

	if err := s.db.Delete(&Comment{}, "id = ?", id).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "删除评论失败")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Comment deleted successfully"})
}

func (s *Server) handleUpload(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		respondError(w, http.StatusBadRequest, "上传数据无效")
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		respondError(w, http.StatusBadRequest, "未找到上传文件")
		return
	}
	defer file.Close()

	if header.Size > 5*1024*1024 {
		respondError(w, http.StatusBadRequest, "文件大小不能超过5MB")
		return
	}

	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		respondError(w, http.StatusInternalServerError, "读取文件失败")
		return
	}
	contentType := http.DetectContentType(buffer[:n])
	if !strings.HasPrefix(contentType, "image/") {
		respondError(w, http.StatusBadRequest, "仅支持图片上传")
		return
	}

	if _, err := file.Seek(0, io.SeekStart); err != nil {
		respondError(w, http.StatusInternalServerError, "处理文件失败")
		return
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		switch contentType {
		case "image/png":
			ext = ".png"
		case "image/jpeg":
			ext = ".jpg"
		case "image/gif":
			ext = ".gif"
		default:
			ext = ".img"
		}
	}

	filename := fmt.Sprintf("%d-%s%s", time.Now().UnixMilli(), uuid.NewString(), ext)
	dstPath := filepath.Join(s.uploadDir, filename)

	dst, err := os.Create(dstPath)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "保存文件失败")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		respondError(w, http.StatusInternalServerError, "写入文件失败")
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"url":      "/uploads/" + filename,
		"filename": header.Filename,
		"size":     header.Size,
		"type":     contentType,
	})
}
