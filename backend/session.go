package main

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/http"
	"time"

	"gorm.io/gorm"
)

func (s *Server) createSession(w http.ResponseWriter, userID string) error {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return err
	}
	token := hex.EncodeToString(tokenBytes)

	if err := s.db.Where("user_id = ?", userID).Delete(&Session{}).Error; err != nil {
		return err
	}

	session := Session{
		Token:     token,
		UserID:    userID,
		ExpiresAt: time.Now().Add(sessionMaxAge),
	}
	if err := s.db.Create(&session).Error; err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(sessionMaxAge.Seconds()),
	})

	return nil
}

func (s *Server) getSession(r *http.Request) (*Session, error) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil {
		if errors.Is(err, http.ErrNoCookie) {
			return nil, nil
		}
		return nil, err
	}

	var session Session
	if err := s.db.Preload("User").First(&session, "token = ?", cookie.Value).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	if session.ExpiresAt.Before(time.Now()) {
		_ = s.db.Delete(&Session{}, "id = ?", session.ID).Error
		return nil, nil
	}

	return &session, nil
}

func (s *Server) getSessionUser(r *http.Request) (*User, error) {
	session, err := s.getSession(r)
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, nil
	}
	return &session.User, nil
}

func (s *Server) clearSession(w http.ResponseWriter, r *http.Request) error {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil {
		if errors.Is(err, http.ErrNoCookie) {
			http.SetCookie(w, &http.Cookie{Name: sessionCookieName, Value: "", Path: "/", MaxAge: -1})
			return nil
		}
		return err
	}

	if err := s.db.Where("token = ?", cookie.Value).Delete(&Session{}).Error; err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:   sessionCookieName,
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})

	return nil
}
