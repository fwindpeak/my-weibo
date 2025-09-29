package main

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID         string `gorm:"primaryKey"`
	Username   string `gorm:"uniqueIndex"`
	Email      string `gorm:"uniqueIndex"`
	Password   *string
	IsAdmin    bool `gorm:"index"`
	Microblogs []Microblog
	Comments   []Comment
	Likes      []Like
	Sessions   []Session
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type Microblog struct {
	ID        string    `gorm:"primaryKey"`
	Content   string    `gorm:"type:text"`
	Images    []Image   `gorm:"constraint:OnDelete:CASCADE"`
	Likes     []Like    `gorm:"constraint:OnDelete:CASCADE"`
	Comments  []Comment `gorm:"constraint:OnDelete:CASCADE"`
	UserID    string    `gorm:"index"`
	User      User
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Image struct {
	ID          string `gorm:"primaryKey"`
	URL         string
	AltText     *string
	MicroblogID string `gorm:"index"`
	Microblog   Microblog
	CreatedAt   time.Time
}

type Like struct {
	ID          string `gorm:"primaryKey"`
	MicroblogID string `gorm:"index;uniqueIndex:idx_like_microblog_user"`
	Microblog   Microblog
	UserID      string `gorm:"index;uniqueIndex:idx_like_microblog_user"`
	User        User
	CreatedAt   time.Time
}

type Comment struct {
	ID          string `gorm:"primaryKey"`
	Content     string `gorm:"type:text"`
	MicroblogID string `gorm:"index"`
	Microblog   Microblog
	UserID      *string `gorm:"index"`
	User        *User
	GuestName   *string
	GuestEmail  *string
	CreatedAt   time.Time
}

type Session struct {
	ID        string `gorm:"primaryKey"`
	Token     string `gorm:"uniqueIndex"`
	UserID    string `gorm:"index"`
	User      User
	ExpiresAt time.Time `gorm:"index"`
	CreatedAt time.Time
}

func (u *User) BeforeCreate(_ *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.NewString()
	}
	return nil
}

func (m *Microblog) BeforeCreate(_ *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

func (img *Image) BeforeCreate(_ *gorm.DB) error {
	if img.ID == "" {
		img.ID = uuid.NewString()
	}
	return nil
}

func (like *Like) BeforeCreate(_ *gorm.DB) error {
	if like.ID == "" {
		like.ID = uuid.NewString()
	}
	return nil
}

func (comment *Comment) BeforeCreate(_ *gorm.DB) error {
	if comment.ID == "" {
		comment.ID = uuid.NewString()
	}
	return nil
}

func (session *Session) BeforeCreate(_ *gorm.DB) error {
	if session.ID == "" {
		session.ID = uuid.NewString()
	}
	return nil
}
