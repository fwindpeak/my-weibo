package main

import "time"

type UserResponse struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	IsAdmin  bool   `json:"isAdmin"`
}

type ImageResponse struct {
	ID        string  `json:"id"`
	URL       string  `json:"url"`
	AltText   *string `json:"altText,omitempty"`
	CreatedAt string  `json:"createdAt,omitempty"`
}

type LikeResponse struct {
	ID        string `json:"id"`
	UserID    string `json:"userId"`
	CreatedAt string `json:"createdAt,omitempty"`
}

type CommentResponse struct {
	ID         string        `json:"id"`
	Content    string        `json:"content"`
	CreatedAt  string        `json:"createdAt"`
	User       *UserResponse `json:"user,omitempty"`
	GuestName  *string       `json:"guestName,omitempty"`
	GuestEmail *string       `json:"guestEmail,omitempty"`
}

type MicroblogResponse struct {
	ID        string            `json:"id"`
	Content   string            `json:"content"`
	Images    []ImageResponse   `json:"images"`
	Likes     []LikeResponse    `json:"likes"`
	Comments  []CommentResponse `json:"comments"`
	CreatedAt string            `json:"createdAt"`
	UpdatedAt string            `json:"updatedAt,omitempty"`
	User      *UserResponse     `json:"user,omitempty"`
}

func toUserResponse(user User) UserResponse {
	return UserResponse{
		ID:       user.ID,
		Username: user.Username,
		Email:    user.Email,
		IsAdmin:  user.IsAdmin,
	}
}

func toImageResponse(image Image) ImageResponse {
	var alt *string
	if image.AltText != nil {
		alt = image.AltText
	}
	createdAt := ""
	if !image.CreatedAt.IsZero() {
		createdAt = image.CreatedAt.UTC().Format(time.RFC3339)
	}
	return ImageResponse{
		ID:        image.ID,
		URL:       image.URL,
		AltText:   alt,
		CreatedAt: createdAt,
	}
}

func toLikeResponse(like Like) LikeResponse {
	createdAt := ""
	if !like.CreatedAt.IsZero() {
		createdAt = like.CreatedAt.UTC().Format(time.RFC3339)
	}
	return LikeResponse{
		ID:        like.ID,
		UserID:    like.UserID,
		CreatedAt: createdAt,
	}
}

func toCommentResponse(comment Comment) CommentResponse {
	var user *UserResponse
	if comment.User != nil {
		u := toUserResponse(*comment.User)
		user = &u
	}
	var guestName *string
	if comment.GuestName != nil && *comment.GuestName != "" {
		guestName = comment.GuestName
	}
	var guestEmail *string
	if comment.GuestEmail != nil && *comment.GuestEmail != "" {
		guestEmail = comment.GuestEmail
	}
	return CommentResponse{
		ID:         comment.ID,
		Content:    comment.Content,
		CreatedAt:  comment.CreatedAt.UTC().Format(time.RFC3339),
		User:       user,
		GuestName:  guestName,
		GuestEmail: guestEmail,
	}
}

func toMicroblogResponse(microblog Microblog) MicroblogResponse {
	images := make([]ImageResponse, 0, len(microblog.Images))
	for _, image := range microblog.Images {
		images = append(images, toImageResponse(image))
	}

	likes := make([]LikeResponse, 0, len(microblog.Likes))
	for _, like := range microblog.Likes {
		likes = append(likes, toLikeResponse(like))
	}

	comments := make([]CommentResponse, 0, len(microblog.Comments))
	for _, comment := range microblog.Comments {
		comments = append(comments, toCommentResponse(comment))
	}

	var user *UserResponse
	if microblog.User.ID != "" {
		u := toUserResponse(microblog.User)
		user = &u
	}

	response := MicroblogResponse{
		ID:        microblog.ID,
		Content:   microblog.Content,
		Images:    images,
		Likes:     likes,
		Comments:  comments,
		CreatedAt: microblog.CreatedAt.UTC().Format(time.RFC3339),
		User:      user,
	}

	if !microblog.UpdatedAt.IsZero() {
		response.UpdatedAt = microblog.UpdatedAt.UTC().Format(time.RFC3339)
	}

	return response
}
