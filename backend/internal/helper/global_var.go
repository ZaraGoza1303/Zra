package helper

import "errors"

var (
	ErrCantEmpty            = errors.New("Field can't be empty")
	ErrNotAllowed           = errors.New("Not Allowed")
	ErrPasswordNotMatch     = errors.New("Password Doesn't Match")
	ErrOldPassNotMatch      = errors.New("Old Password Doesn't Match")
	ErrCredentialsNotMatch  = errors.New("Credentials Doesn't Match")
	ErrEmailAlreadyUsed     = errors.New("Email Already Used")
	ErrAlreadyUsed          = errors.New("Token not valid (already used)")
	ErrAlreadySent          = errors.New("Already Sent")
	ErrTokenExpired         = errors.New("Token expired")
	ErrRefreshTokenNotValid = errors.New("Refresh token not valid")
	ErrNotVerified          = errors.New("Email not verified")
	ErrUnauthorized         = errors.New("Unauthorized")
)
