package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"gorm.io/gorm"
)

const (
	sessionCookieName = "my_weibo_session"
	sessionMaxAge     = 7 * 24 * time.Hour
)

type ServerConfig struct {
	UploadDir      string
	AllowedOrigins []string
}

type Server struct {
	db             *gorm.DB
	router         *chi.Mux
	uploadDir      string
	allowedOrigins map[string]struct{}
}

func NewServer(db *gorm.DB, cfg ServerConfig) (*Server, error) {
	if cfg.UploadDir == "" {
		return nil, errors.New("upload directory is required")
	}
	if err := os.MkdirAll(cfg.UploadDir, 0o755); err != nil {
		return nil, err
	}

	allowed := make(map[string]struct{}, len(cfg.AllowedOrigins))
	for _, origin := range cfg.AllowedOrigins {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			allowed[origin] = struct{}{}
		}
	}

	server := &Server{
		db:             db,
		router:         chi.NewRouter(),
		uploadDir:      cfg.UploadDir,
		allowedOrigins: allowed,
	}

	server.router.Use(middleware.RequestID)
	server.router.Use(middleware.RealIP)
	server.router.Use(middleware.Logger)
	server.router.Use(middleware.Recoverer)
	server.router.Use(server.corsMiddleware)

	server.registerRoutes()

	return server, nil
}

func (s *Server) Router() http.Handler {
	return s.router
}

func (s *Server) registerRoutes() {
	s.router.Get("/api/health", s.handleHealth)

	s.router.Route("/api/auth", func(r chi.Router) {
		r.Post("/login", s.handleUserLogin)
		r.Post("/admin-login", s.handleAdminLogin)
		r.Post("/logout", s.handleLogout)
		r.Get("/session", s.handleSession)
	})

	s.router.Route("/api/microblogs", func(r chi.Router) {
		r.Get("/", s.handleListMicroblogs)
		r.Post("/", s.handleCreateMicroblog)
		r.Route("/{id}", func(r chi.Router) {
			r.Put("/", s.handleUpdateMicroblog)
			r.Delete("/", s.handleDeleteMicroblog)
			r.Post("/like", s.handleLikeMicroblog)
			r.Delete("/like", s.handleClearLikes)
			r.Get("/comments", s.handleListComments)
			r.Post("/comments", s.handleCreateComment)
		})
	})

	s.router.Route("/api/comments", func(r chi.Router) {
		r.Route("/{id}", func(r chi.Router) {
			r.Put("/", s.handleUpdateComment)
			r.Delete("/", s.handleDeleteComment)
		})
	})

	s.router.Post("/api/upload", s.handleUpload)

	fileServer := http.StripPrefix("/uploads/", http.FileServer(http.Dir(s.uploadDir)))
	s.router.Get("/uploads/*", func(w http.ResponseWriter, r *http.Request) {
		fileServer.ServeHTTP(w, r)
	})
}

func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			if _, ok := s.allowedOrigins[origin]; ok {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
				w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
				if r.Method == http.MethodOptions {
					w.WriteHeader(http.StatusNoContent)
					return
				}
			} else if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusForbidden)
				return
			}
		} else if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if payload != nil {
		_ = json.NewEncoder(w).Encode(payload)
	}
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"message": message})
}

func bindJSON(r *http.Request, dest interface{}) error {
	defer r.Body.Close()
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(dest)
}

func (s *Server) preloadMicroblog(id string) (Microblog, error) {
	var microblog Microblog
	err := s.db.Preload("User").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC")
		}).
		Preload("Likes").
		Preload("Comments", func(db *gorm.DB) *gorm.DB {
			return db.Preload("User").Order("created_at ASC")
		}).
		First(&microblog, "id = ?", id).Error
	return microblog, err
}
