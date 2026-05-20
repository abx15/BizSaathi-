package auth

import (
	"errors"
	"fmt"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	Sub      string `json:"sub"`      // userId
	TenantID string `json:"tenantId"`  // tenantId
	Role     string `json:"role"`      // role
	jwt.RegisteredClaims
}

type JWTVerifier struct {
	secret []byte
}

func NewJWTVerifier(secret string) *JWTVerifier {
	return &JWTVerifier{
		secret: []byte(secret),
	}
}

func (v *JWTVerifier) VerifyToken(tokenString string) (*Claims, error) {
	// Strip Bearer prefix if present
	if strings.HasPrefix(tokenString, "Bearer ") {
		tokenString = tokenString[7:]
	}

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Verify signature method is HMAC (HS256)
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return v.secret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		if claims.Sub == "" {
			return nil, errors.New("missing user identifier (sub) in token claims")
		}
		return claims, nil
	}

	return nil, errors.New("invalid JWT claims signature")
}
