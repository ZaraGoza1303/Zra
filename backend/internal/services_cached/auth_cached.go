package services_cached

import (
	"chatapp/core"
	"chatapp/dto"
	"chatapp/internal/helper"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/markbates/goth"
	"github.com/redis/go-redis/v9"
)

type cachedAuthServices struct {
	authServices core.AuthServices
	authRepo     core.AuthRepositories
	rdb          *redis.Client
}

func NewCachedAuthServices(
	authServices core.AuthServices,
	authRepo core.AuthRepositories,
	rdb *redis.Client,
) core.AuthServices {
	return &cachedAuthServices{
		authServices: authServices,
		authRepo:     authRepo,
		rdb:          rdb,
	}
}

// Register implements [core.AuthServices].
func (s *cachedAuthServices) Register(ctx context.Context, req dto.UserRegisterRequest) (*dto.UserRegisterResponse, error) {
	return s.authServices.Register(ctx, req)
}

// Login implements [core.AuthServices].
func (s *cachedAuthServices) Login(ctx context.Context, req dto.UserLoginRequest) (*dto.UserLoginResponse, error) {
	// 1. Rate limiting (Redis)
	loginAttemptKey := "login_attempt:" + strings.ToLower(req.Email)
	attempt, _ := s.rdb.Get(ctx, loginAttemptKey).Int()
	if attempt >= 10 {
		return nil, errors.New("Too many attempts, wait 10 minute to try again")
	}

	// 2. Delegate ke auth service (DB only)
	resp, err := s.authServices.Login(ctx, req)
	if err != nil {
		// Increment failed attempt
		s.rdb.Incr(ctx, loginAttemptKey)
		s.rdb.Expire(ctx, loginAttemptKey, 10*time.Minute)
		return nil, err
	}

	// 3. Reset counter + cache token di Redis (cache-aside)
	s.rdb.Del(ctx, loginAttemptKey)
	s.cacheTokenFromJWT(ctx, resp.AccessToken, resp.RefreshToken, req.RememberMe)

	return resp, nil
}

// LoginProvider implements [core.AuthServices].
func (s *cachedAuthServices) LoginProvider(ctx context.Context, req goth.User, rememberMe bool) (*dto.LoginProviderResponse, error) {
	resp, err := s.authServices.LoginProvider(ctx, req, rememberMe)
	if err != nil {
		return nil, err
	}

	// Cache token di Redis
	s.cacheTokenFromJWT(ctx, resp.AccessToken, resp.RefreshToken, rememberMe)
	return resp, nil
}

// ForgotPassword implements [core.AuthServices].
func (s *cachedAuthServices) ForgotPassword(ctx context.Context, req dto.ForgotPasswordRequest) (string, error) {
	return s.authServices.ForgotPassword(ctx, req)
}

// VerifyEmail implements [core.AuthServices].
func (s *cachedAuthServices) VerifyEmail(ctx context.Context, req dto.VerifyEmailOTPRequest) error {
	return s.authServices.VerifyEmail(ctx, req)
}

// Logout implements [core.AuthServices].
func (s *cachedAuthServices) Logout(ctx context.Context, req dto.LogoutRequest) error {
	// 1. Hapus dari DB (via auth service)
	if err := s.authServices.Logout(ctx, req); err != nil {
		return err
	}

	// 2. Hapus dari Redis
	userKey := "user:auth:" + strconv.Itoa(int(req.UserID))
	accessKey := "access:" + req.AccessUUID
	refreshKey := "refresh:" + req.RefreshUUID

	pipe := s.rdb.Pipeline()
	pipe.Del(ctx, accessKey, refreshKey)
	pipe.SRem(ctx, userKey, accessKey, refreshKey)
	pipe.Exec(ctx)

	return nil
}

// Refresh implements [core.AuthServices].
func (s *cachedAuthServices) Refresh(ctx context.Context, req dto.RefreshTokenClaimsRequest) (*dto.RefreshResponse, error) {
	// 1. Cache-aside: check Redis dulu untuk refresh token
	refreshKey := "refresh:" + req.RefreshUUID

	refreshExists, _ := s.rdb.Exists(ctx, refreshKey).Result()

	// 2. Kalau miss di Redis, fallback ke DB
	if refreshExists == 0 {
		exists, err := s.authRepo.SelectRefreshToken(ctx, req.RefreshToken, req.RefreshUUID)
		if err != nil {
			return nil, err
		}
		if !exists {
			return nil, helper.ErrTokenExpired
		}
		// Populate cache setelah DB hit
		refreshDuration := s.getRefreshDuration(req.IsPersistent)
		s.rdb.Set(ctx, refreshKey, req.UserID, refreshDuration)
	}

	// 3. Invalidate old Redis keys
	accessKey := "access:" + req.AccessUUID
	s.rdb.Del(ctx, refreshKey, accessKey)
	userKey := "user:auth:" + strconv.Itoa(int(req.UserID))
	s.rdb.SRem(ctx, userKey, refreshKey, accessKey)

	// 4. Delegate ke auth service (generate new tokens + update DB)
	resp, err := s.authServices.Refresh(ctx, req)
	if err != nil {
		return nil, err
	}

	// 5. Cache new tokens di Redis
	s.cacheTokenFromJWT(ctx, resp.AccessToken, resp.RefreshToken, req.IsPersistent)

	return resp, nil
}

// cacheTokenFromJWT parses JWT and caches access/refresh tokens in Redis
func (s *cachedAuthServices) cacheTokenFromJWT(ctx context.Context, accessToken, refreshToken string, isPersistent bool) {
	claims, err := parseJWTClaims(refreshToken)
	if err != nil {
		return
	}

	userID, ok := claims["ID"].(float64)
	if !ok {
		return
	}

	refreshUUID, ok := claims["refresh_uuid"].(string)
	if !ok {
		return
	}

	accessUUID, ok := claims["access_uuid"].(string)
	if !ok {
		return
	}

	uid := uint(userID)
	accessDuration := 15 * time.Minute
	refreshDuration := s.getRefreshDuration(isPersistent)

	userKey := "user:auth:" + strconv.Itoa(int(uid))
	accessKey := "access:" + accessUUID
	refreshKey := "refresh:" + refreshUUID

	pipe := s.rdb.Pipeline()
	pipe.Set(ctx, accessKey, uid, accessDuration)
	pipe.Set(ctx, refreshKey, uid, refreshDuration)
	pipe.SAdd(ctx, userKey, accessKey, refreshKey)
	pipe.Expire(ctx, userKey, refreshDuration)
	pipe.Exec(ctx)
}

// getRefreshDuration returns the refresh token duration based on persistent flag
func (s *cachedAuthServices) getRefreshDuration(isPersistent bool) time.Duration {
	if isPersistent {
		return 30 * 24 * time.Hour
	}
	return 1 * time.Hour
}

// parseJWTClaims parses a JWT token and returns the claims as a map
func parseJWTClaims(tokenStr string) (map[string]interface{}, error) {
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid JWT format")
	}

	// Pad the payload if necessary
	payload := parts[1]
	if m := len(payload) % 4; m != 0 {
		payload += strings.Repeat("=", 4-m)
	}

	decoded, err := base64.URLEncoding.DecodeString(payload)
	if err != nil {
		return nil, err
	}

	var claims map[string]interface{}
	if err := json.Unmarshal(decoded, &claims); err != nil {
		return nil, err
	}

	return claims, nil
}
