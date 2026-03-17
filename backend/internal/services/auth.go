package services

import (
	"chatapp/core"
	"chatapp/dto"
	"chatapp/internal/helper"
	"chatapp/internal/models"
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/markbates/goth"
	"github.com/matcornic/hermes/v2"
	"gorm.io/gorm"
)

type authService struct {
	AuthRepositories core.AuthRepositories
	UserRepositories core.UserRepositories
	UserServices     core.UserServices
	frontendUrl      string
	backendUrl       string
	frontendJoinUrl  string
	publicPath       string
	roomsPath        string
	usersPath        string
}

func NewAuth(repo core.AuthRepositories, userRepositories core.UserRepositories, userService core.UserServices) core.AuthServices {
	return &authService{AuthRepositories: repo,
		UserRepositories: userRepositories,
		UserServices:     userService,
		frontendUrl:      os.Getenv("FRONTEND_URL"),
		backendUrl:       os.Getenv("BACKEND_URL"),
		frontendJoinUrl:  os.Getenv("FRONTEND_JOIN_URL"),
		publicPath:       os.Getenv("PUBLIC_PATH"),
		roomsPath:        os.Getenv("ROOMS_PATH"),
		usersPath:        os.Getenv("USERS_PATH"),
	}
}

func (s *authService) Register(ctx context.Context, req dto.UserRegisterRequest) (*dto.UserRegisterResponse, error) {
	if req.Password != req.ConfirmPassword {
		return nil, helper.ErrPasswordNotMatch
	}

	hashedPassword, err := helper.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	otpCode, err := helper.GenerateOTP(6)
	if err != nil {
		return nil, err
	}

	newUser := models.User{
		Name:        req.Name,
		Username:    req.Username,
		Email:       req.Email,
		Password:    hashedPassword,
		VerifyToken: &otpCode,
		IsVerified:  false,
	}

	err = s.AuthRepositories.Register(ctx, &newUser)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, helper.ErrEmailAlreadyUsed
		}
		return nil, err
	}

	logoUrl := fmt.Sprintf("%s%s%s", s.backendUrl, s.publicPath, "mas_amba.jpg")

	h := hermes.Hermes{
		Product: hermes.Product{
			Name: "Wowo Sawit",
			Link: "",
			Logo: logoUrl,
		},
	}

	emailContent := hermes.Email{
		Body: hermes.Body{
			Name: newUser.Name,
			Intros: []string{
				"Kami menerima permintaan untuk pembuatan akun Anda.",
			},
			Actions: []hermes.Action{
				{
					Instructions: "Silakan masukkan kode OTP di bawah ini untuk memverifikasi akun Anda:",
					// 2. Gunakan InviteCode agar format OTP terlihat besar dan jelas di Email
					InviteCode: otpCode,
				},
			},
			Outros: []string{
				"Jika Anda tidak merasa mendaftar akun ini, abaikan saja email ini.",
			},
		},
	}

	emailBody, err := h.GenerateHTML(emailContent)
	if err != nil {
		return nil, err
	}

	go func(emailBody string, targetEmail string) {
		err = helper.SendEmail(true, emailBody, targetEmail)
		if err != nil {
			log.Printf("Failed to send email verification for %s: %v", targetEmail, err)
		}
	}(emailBody, req.Email)

	notes := "Check your email inboxes to get your OTP verification code"

	response := dto.UserRegisterResponse{
		Email:    newUser.Email,
		Username: newUser.Username,
		Password: newUser.Password,
		Notes:    notes,
	}

	return &response, nil
}

func (s *authService) Login(ctx context.Context, req dto.UserLoginRequest) (*dto.UserLoginResponse, error) {
	user, err := s.AuthRepositories.Login(ctx, req.Email, req.Password)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, helper.ErrCredentialsNotMatch
		}
		return nil, err
	}

	if !user.IsVerified {
		return nil, helper.ErrNotVerified
	}

	if err := helper.CompareHashedPassword(user.Password, req.Password); err != nil {
		return nil, helper.ErrCredentialsNotMatch
	}

	jwtAccessKey := os.Getenv("JWT_KEY")
	jwtRefreshKey := os.Getenv("JWT_REFRESH_KEY")

	jwtAccessDuration, _ := strconv.Atoi(os.Getenv("JWT_EXP"))
	jwtRefreshDuration, _ := strconv.Atoi(os.Getenv("JWT_REFRESH_EXP"))

	if jwtAccessDuration == 0 {
		jwtAccessDuration = 900
	}
	if jwtRefreshDuration == 0 {
		jwtRefreshDuration = 3600 // Default 1 Jam
	}

	accessDuration := time.Duration(jwtAccessDuration) * time.Second
	refreshDuration := time.Duration(jwtRefreshDuration) * time.Minute

	if req.RememberMe {
		refreshDuration = 30 * 24 * time.Hour
	}

	genTokenReq := dto.GenerateJwtRequest{
		UserID:          user.ID,
		JwtAccessKey:    jwtAccessKey,
		JwtRefreshKey:   jwtRefreshKey,
		AccessDuration:  accessDuration,
		RefreshDuration: refreshDuration,
		IsPersistent:    req.RememberMe,
	}

	genToken, err := helper.GenerateJwtToken(genTokenReq)

	insertRefreshReq := dto.InsertRefreshRequest{
		UserID:          user.ID,
		RefreshToken:    genToken.SignedRefreshKey,
		RefreshUUID:     genToken.RefreshUUID,
		AccessUUID:      genToken.AccessUUID,
		AccessDuration:  accessDuration,
		RefreshDuration: refreshDuration,
	}

	err = s.AuthRepositories.InsertRefreshToken(ctx, insertRefreshReq)
	if err != nil {
		return nil, errors.New("Failed to generate token")
	}

	var profilePicture string

	if user.ProfilePicture != nil {
		profilePicture = *user.ProfilePicture
	}

	response := dto.UserLoginResponse{
		Username:       user.Username,
		Name:           user.Name,
		Email:          user.Email,
		Bio:            user.Bio,
		ProfilePicture: profilePicture,
		AccessToken:    genToken.SignedAccessKey,
		RefreshToken:   genToken.SignedRefreshKey,
	}

	return &response, nil
}

func (s *authService) LoginProvider(ctx context.Context, req goth.User, rememberMe bool) (*dto.LoginProviderResponse, error) {
	existUser, err := s.UserServices.FindByEmailAndProvider(ctx, req.Email, req.Provider)
	if err != nil {
		newUser := models.User{
			ProfilePicture: &req.AvatarURL,
			Email:          req.Email,
			Provider:       &req.Provider,
			Username:       req.Name,
			Name:           req.Name,
			IsVerified:     true,
		}

		errReg := s.AuthRepositories.Register(ctx, &newUser)
		if errReg != nil {
			return nil, errReg
		}

		var profilePicture string
		var provider string

		if newUser.ProfilePicture != nil {
			profilePicture = *newUser.ProfilePicture
		}

		if newUser.Provider != nil {
			provider = *newUser.Provider
		}

		existUser = &dto.UserResponse{
			ID:             newUser.ID,
			ProfilePicture: profilePicture,
			Email:          newUser.Email,
			Provider:       provider,
			Username:       newUser.Username,
			Name:           newUser.Name,
			Bio:            newUser.Bio,
			IsVerified:     newUser.IsVerified,
		}
	}

	jwtAccessKey := os.Getenv("JWT_KEY")
	jwtRefreshKey := os.Getenv("JWT_REFRESH_KEY")

	jwtAccessDuration, _ := strconv.Atoi(os.Getenv("JWT_EXP"))
	jwtRefreshDuration, _ := strconv.Atoi(os.Getenv("JWT_REFRESH_EXP"))

	if jwtAccessDuration == 0 {
		jwtAccessDuration = 900
	}
	if jwtRefreshDuration == 0 {
		jwtRefreshDuration = 3600 // Default 1 Jam
	}

	accessDuration := time.Duration(jwtAccessDuration) * time.Second
	refreshDuration := time.Duration(jwtRefreshDuration) * time.Minute

	if rememberMe {
		refreshDuration = 30 * 24 * time.Hour
	}

	genTokenReq := dto.GenerateJwtRequest{
		UserID:          existUser.ID,
		JwtAccessKey:    jwtAccessKey,
		JwtRefreshKey:   jwtRefreshKey,
		AccessDuration:  accessDuration,
		RefreshDuration: refreshDuration,
		IsPersistent:    rememberMe,
	}

	genToken, err := helper.GenerateJwtToken(genTokenReq)

	insertRefreshReq := dto.InsertRefreshRequest{
		UserID:          existUser.ID,
		RefreshToken:    genToken.SignedRefreshKey,
		RefreshUUID:     genToken.RefreshUUID,
		AccessUUID:      genToken.AccessUUID,
		AccessDuration:  accessDuration,
		RefreshDuration: refreshDuration,
	}

	err = s.AuthRepositories.InsertRefreshToken(ctx, insertRefreshReq)
	if err != nil {
		return nil, err
	}

	response := dto.LoginProviderResponse{
		AccessToken:  genToken.SignedAccessKey,
		RefreshToken: genToken.SignedRefreshKey,
	}

	return &response, nil
}

func (s *authService) ForgotPassword(ctx context.Context, req dto.ForgotPasswordRequest) (string, error) {
	existUser, err := s.UserServices.FindByEmail(ctx, req.Email)
	if err != nil {
		return "Email reset password telah dikirim", nil
	}

	if existUser.Provider != "" {
		return "", errors.New("Your account is using google provider!")
	}

	token, err := helper.GenerateCustomToken(16)
	if err != nil {
		return "", err
	}

	updateRequest := dto.UpdatePassResetTokenRequest{
		UserID:    existUser.ID,
		Token:     token,
		ExpiresAt: time.Now().Add(10 * time.Minute),
	}

	if err := s.UserServices.UpdatePassResetToken(ctx, existUser.ID, updateRequest); err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return "", helper.ErrAlreadySent
		}
		return "", err
	}

	logoUrl := fmt.Sprintf("%s%s%s", s.backendUrl, s.publicPath, "mas_amba.jpg")
	verifyResetLink := fmt.Sprintf("%s/api/auth/verify-reset?token=%s", s.backendUrl, token)

	h := hermes.Hermes{
		Product: hermes.Product{
			Name: "Wowo Sawit",
			Link: "",
			Logo: logoUrl,
		},
	}

	emailContent := hermes.Email{
		Body: hermes.Body{
			Name: existUser.Name,
			Intros: []string{
				"Kami menerima permintaan untuk reset password akun Anda.",
			},
			Actions: []hermes.Action{
				{
					Instructions: "Klik tombol di bawah ini untuk mereset password Anda:",
					Button: hermes.Button{
						Color: "#22BC66", // Hijau
						Text:  "Reset Password",
						Link:  verifyResetLink,
					},
				},
			},
			Outros: []string{
				"Jika Anda tidak merasa meminta ini, abaikan saja email ini.",
			},
		},
	}

	emailBody, err := h.GenerateHTML(emailContent)
	if err != nil {
		return "", err
	}

	err = helper.SendEmail(true, emailBody, req.Email)
	if err != nil {
		return "", err
	}

	return "Email reset password telah dikirim", nil
}

func (s *authService) VerifyEmail(ctx context.Context, req dto.VerifyEmailOTPRequest) error {
	user, err := s.UserRepositories.GetByEmail(ctx, req.Email)
	if err != nil {
		return errors.New("user tidak ditemukan")
	}

	if user.IsVerified {
		return errors.New("akun sudah terverifikasi")
	}

	if user.VerifyToken == nil || *user.VerifyToken != req.OTP {
		return errors.New("kode OTP tidak valid")
	}

	user.IsVerified = true
	user.VerifyToken = nil

	if err := s.UserRepositories.VerifyEmail(ctx, user.ID, user); err != nil {
		return err
	}

	return nil
}

func (s *authService) Logout(ctx context.Context, req dto.LogoutRequest) error {
	_, err := s.UserRepositories.GetById(ctx, req.UserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("User not found: %w", err)
		}
		return err
	}

	if err := s.AuthRepositories.DeleteRefreshToken(ctx, req.UserID, req.RefreshToken, req.AccessUUID, req.RefreshUUID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("Failed to logout: %w", err)
		}
		return err
	}

	return nil
}

func (s *authService) Refresh(ctx context.Context, req dto.RefreshRequest) (*dto.RefreshResponse, error) {
	token, err := jwt.Parse(req.RefreshToken, func(token *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("JWT_REFRESH_KEY")), nil
	})

	if err != nil || !token.Valid {
		return nil, helper.ErrRefreshTokenNotValid
	}

	claims := token.Claims.(jwt.MapClaims)
	userID := uint(claims["ID"].(float64))

	// Labih aman ambil boolean dari claims
	var isPersistent bool
	if rem, ok := claims["rem"]; ok {
		if val, bOk := rem.(bool); bOk {
			isPersistent = val
		}
	}

	oldAccessUUID, ok := claims["access_uuid"].(string)
	if !ok {
		return nil, helper.ErrUnauthorized
	}
	oldRefreshUUID, ok := claims["refresh_uuid"].(string)
	if !ok {
		return nil, helper.ErrUnauthorized
	}

	exists, err := s.AuthRepositories.SelectRefreshToken(ctx, req.RefreshToken, oldRefreshUUID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("User not found: %w", err)
		}
		return nil, err
	}

	if !exists {
		return nil, helper.ErrTokenExpired
	}

	jwtAccessKey := os.Getenv("JWT_KEY")
	jwtRefreshKey := os.Getenv("JWT_REFRESH_KEY")

	jwtAccessDuration, _ := strconv.Atoi(os.Getenv("JWT_EXP"))
	jwtRefreshDuration, _ := strconv.Atoi(os.Getenv("JWT_REFRESH_EXP"))

	if jwtAccessDuration == 0 {
		jwtAccessDuration = 900
	}
	if jwtRefreshDuration == 0 {
		jwtRefreshDuration = 60
	}

	accessDuration := time.Duration(jwtAccessDuration) * time.Second
	refreshDuration := time.Duration(jwtRefreshDuration) * time.Minute

	if isPersistent {
		refreshDuration = 30 * 24 * time.Hour
	}

	genTokenReq := dto.GenerateJwtRequest{
		UserID:          userID,
		JwtAccessKey:    jwtAccessKey,
		JwtRefreshKey:   jwtRefreshKey,
		AccessDuration:  accessDuration,
		RefreshDuration: refreshDuration,
		IsPersistent:    isPersistent,
	}

	genToken, err := helper.GenerateJwtToken(genTokenReq)

	updateRefreshReq := dto.UpdateRefreshRequest{
		UserID:          userID,
		OldRefreshToken: req.RefreshToken,
		OldRefreshUUID:  oldRefreshUUID,
		NewRefreshToken: genToken.SignedRefreshKey,
		NewRefreshUUID:  genToken.RefreshUUID,
		OldAccessUUID:   oldAccessUUID,
		NewAccessUUID:   genToken.AccessUUID,
		AccessDuration:  accessDuration,
		RefreshDuration: refreshDuration,
	}

	err = s.AuthRepositories.UpdateRefreshToken(ctx, updateRefreshReq)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, helper.ErrTokenExpired
		}
		return nil, err
	}

	response := dto.RefreshResponse{
		AccessToken:  genToken.SignedAccessKey,
		RefreshToken: genToken.SignedRefreshKey,
	}

	return &response, nil
}
