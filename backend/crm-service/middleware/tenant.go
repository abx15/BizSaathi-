package middleware

import (
	"net/http"

	"github.com/bizsaathi/crm-service/utils"
)

func TenantRequired(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tenantID := GetTenantID(r.Context())
		if tenantID == "" {
			utils.Error(w, http.StatusForbidden, "FORBIDDEN", "Tenant ID is required")
			return
		}
		next.ServeHTTP(w, r)
	})
}
