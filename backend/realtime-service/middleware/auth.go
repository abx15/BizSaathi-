package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/bizsaathi/realtime-service/auth"
	"github.com/bizsaathi/realtime-service/utils"
)

type contextKey string

const ClaimsKey contextKey = "claims"

func JWTAuth(verifier *auth.JWTVerifier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := ""
			authHeader := r.Header.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				token = authHeader[7:]
			}

			if token == "" {
				token = r.URL.Query().Get("token")
			}

			if token == "" {
				utils.Error(w, http.StatusUnauthorized, "unauthorized: missing token")
				return
			}

			claims, err := verifier.VerifyToken(token)
			if err != nil {
				utils.Error(w, http.StatusUnauthorized, "unauthorized: invalid token")
				return
			}

			// Add claims to request context
			ctx := context.WithValue(r.Context(), ClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetClaims retrieves verified claims from context
func GetClaims(ctx context.Context) (*auth.Claims, bool) {
	claims, ok := ctx.Value(ClaimsKey).(*auth.Claims)
	return claims, ok
}
