package handler

import (
	"chatapp/core"
	"chatapp/dto"
	"chatapp/internal/helper"
	"errors"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

type authHandler struct {
	AuthServices core.AuthServices
	UserServices core.UserServices
}

func NewAuth(router fiber.Router, authServices core.AuthServices, userServices core.UserServices, middleware fiber.Handler) {
	handler := authHandler{
		AuthServices: authServices,
		UserServices: userServices,
	}

	route := router.Group("/api")
	route.Post("/auth/register", handler.Register)
	route.Post("/auth/login", handler.Login)
	route.Post("/auth/forgot-password", handler.ForgotPassword)
	route.Get("/auth/verify-reset", handler.VerifyResetPassword)
	route.Post("/auth/reset-password", handler.ResetPassword)
	route.Post("/auth/verify-email", handler.VerifyEmail)

	route.Post("/auth/refresh", handler.Refresh)
	route.Post("/auth/logout", middleware, handler.Logout)
}

func (h *authHandler) Register(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	var user dto.UserRegisterRequest
	if err := c.BodyParser(&user); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(dto.SendErrorResponse(err.Error()))
	}

	user.Name = user.Username

	errValidate := helper.Validate(user)
	if errValidate != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponseWithData("Validation Failed", errValidate))
	}

	response, err := h.AuthServices.Register(ctx, user)
	if err != nil {
		if errors.Is(err, helper.ErrPasswordNotMatch) {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}
		if errors.Is(err, helper.ErrEmailAlreadyUsed) {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Register Successfully", response))
}

func (h *authHandler) Login(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()
	var user dto.UserLoginRequest
	if err := c.BodyParser(&user); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(dto.SendErrorResponse(err.Error()))
	}

	errValidate := helper.Validate(user)
	if errValidate != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponseWithData("Validation Failed", errValidate))
	}

	response, err := h.AuthServices.Login(ctx, user)
	if err != nil {
		if errors.Is(err, helper.ErrCredentialsNotMatch) {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}

		if errors.Is(err, helper.ErrNotVerified) {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Login Successfully", response))
}

func (h *authHandler) ForgotPassword(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	var email dto.ForgotPasswordRequest
	if err := helper.StrictBodyParser(c, &email); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse("Request body hanya boleh berisi email"))
	}

	validateErr := helper.Validate(email)
	if validateErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponseWithData("Validation Failed", validateErr))
	}

	msg, err := h.AuthServices.ForgotPassword(ctx, email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}

		if errors.Is(err, helper.ErrAlreadySent) {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Success", msg))

}

func (h *authHandler) VerifyResetPassword(c *fiber.Ctx) error {
	token := c.Query("token")
	frontendURL := os.Getenv("FRONTEND_URL")
	return c.Redirect(frontendURL + "/reset-password?token=" + token)
}

func (h *authHandler) ResetPassword(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	var request dto.ResetPasswordRequest
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
	}

	token := c.Query("token")

	if token == "" {
		token = request.Token
	}

	if token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse("Token is required"))
	}

	request.Token = token

	validateErr := helper.Validate(request)
	if validateErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponseWithData("Validation Failed", validateErr))
	}

	if err := h.UserServices.ExecuteReset(ctx, token, request); err != nil {
		if errors.Is(err, helper.ErrCantEmpty) {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}

		if errors.Is(err, helper.ErrPasswordNotMatch) {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Password Updated", nil))
}

func (h *authHandler) VerifyEmail(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	var req dto.VerifyEmailOTPRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse("Format request tidak valid"))
	}

	validateErr := helper.Validate(req)
	if validateErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponseWithData("Validation Failed", validateErr))
	}

	if err := h.AuthServices.VerifyEmail(ctx, req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Verifikasi Email Berhasil", nil))
}

func (h *authHandler) Logout(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	var request dto.LogoutRequest
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(dto.SendErrorResponse(err.Error()))
	}

	userToken := c.Locals("user").(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)
	userID := uint(claims["ID"].(float64))
	accessUUID := claims["access_uuid"].(string)
	refreshUUID := claims["refresh_uuid"].(string)

	request.UserID = userID
	request.AccessUUID = accessUUID
	request.RefreshUUID = refreshUUID

	validateErr := helper.Validate(request)
	if validateErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponseWithData("Validation Failed", validateErr))
	}

	if err := h.AuthServices.Logout(ctx, request); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Logout Successfully", nil))
}

func (h *authHandler) Refresh(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	var request dto.RefreshRequest
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(dto.SendErrorResponse(err.Error()))
	}

	validateErr := helper.Validate(request)
	if validateErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponseWithData("Validation Failed", validateErr))
	}

	refreshToken, err := h.AuthServices.Refresh(ctx, request)
	if err != nil {
		if errors.Is(err, helper.ErrTokenExpired) {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}

		if errors.Is(err, helper.ErrRefreshTokenNotValid) {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}

		if errors.Is(err, helper.ErrUnauthorized) {
			return c.Status(fiber.StatusUnauthorized).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Refreshed", refreshToken))
}
