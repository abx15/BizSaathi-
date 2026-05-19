package middleware

import (
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
)

type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(rw, r)

		tenantID := GetTenantID(r.Context())
		log.Info().
			Str("method", r.Method).
			Str("path", r.URL.Path).
			Str("tenantId", tenantID).
			Int("status", rw.status).
			Dur("duration", time.Since(start)).
			Msg("request")
	})
}
