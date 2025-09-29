package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func main() {
	if err := run(); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func run() error {
	dbPath := getEnv("DATABASE_PATH", filepath.Join("backend", "data", "weibo.db"))
	uploadDir := getEnv("UPLOAD_DIR", filepath.Join("backend", "public", "uploads"))
	addr := getEnv("SERVER_ADDR", ":8080")
	allowedOrigins := parseAllowedOrigins(os.Getenv("ALLOWED_ORIGINS"))
	if len(allowedOrigins) == 0 {
		allowedOrigins = []string{"http://localhost:5173"}
	}

	db, err := initDatabase(dbPath)
	if err != nil {
		return err
	}

	server, err := NewServer(db, ServerConfig{
		UploadDir:      uploadDir,
		AllowedOrigins: allowedOrigins,
	})
	if err != nil {
		return err
	}

	log.Printf("listening on %s", addr)
	return http.ListenAndServe(addr, server.Router())
}

func getEnv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func parseAllowedOrigins(input string) []string {
	if strings.TrimSpace(input) == "" {
		return nil
	}
	parts := strings.Split(input, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}
