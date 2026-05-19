package utils

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

func DecodeAndValidate(r *http.Request, dst interface{}) error {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return err
	}
	defer r.Body.Close()

	if err := json.Unmarshal(body, dst); err != nil {
		return err
	}

	return validate.Struct(dst)
}

func FormatValidationErrors(err error) string {
	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		msg := ""
		for _, fe := range validationErrors {
			msg += fe.Field() + " is " + fe.Tag() + "; "
		}
		return msg
	}
	return err.Error()
}
