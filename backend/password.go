package main

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"strings"

	"golang.org/x/crypto/scrypt"
)

const (
	saltLength = 16
	keyLength  = 64
)

func hashPassword(password string) (string, error) {
	salt := make([]byte, saltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	key, err := scrypt.Key([]byte(password), salt, 1<<15, 8, 1, keyLength)
	if err != nil {
		return "", err
	}

	return hex.EncodeToString(salt) + ":" + hex.EncodeToString(key), nil
}

func verifyPassword(password, stored string) (bool, error) {
	parts := strings.Split(stored, ":")
	if len(parts) != 2 {
		return false, errors.New("invalid password format")
	}

	salt, err := hex.DecodeString(parts[0])
	if err != nil {
		return false, err
	}

	expected, err := hex.DecodeString(parts[1])
	if err != nil {
		return false, err
	}

	derived, err := scrypt.Key([]byte(password), salt, 1<<15, 8, 1, keyLength)
	if err != nil {
		return false, err
	}

	if len(expected) != len(derived) {
		return false, nil
	}

	if subtle.ConstantTimeCompare(expected, derived) == 1 {
		return true, nil
	}

	return false, nil
}
