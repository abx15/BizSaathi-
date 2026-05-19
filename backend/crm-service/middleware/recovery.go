package middleware

import (
	"net/http"

	"github.com/rs/zerolog/log"
)

func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Error().Interface("panic", err).Str("path", r.URL.Path).Msg("recovered from panic")
				http.Error(w, `{"success":false,"error":{"code":"INTERNAL_ERROR","message":"Internal server error","statusCode":500}}`, http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}
