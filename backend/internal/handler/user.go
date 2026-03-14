package handler

import (
	"chatapp/core"
	"chatapp/dto"
	"chatapp/internal/helper"
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

type userHandler struct {
	UserServices core.UserServices
}

func NewUser(router fiber.Router, service core.UserServices, middleware fiber.Handler) {
	handler := userHandler{UserServices: service}

	route := router.Group("/api")
	route.Get("/user", middleware, handler.FindAll)
	route.Get("/user/online", middleware, handler.FindOnlineUsers)
	route.Get("/user/list-friend", middleware, handler.FindListFriend)
	route.Get("/user/list-friend-requests", middleware, handler.FindListFriendRequest)
	route.Get("/user/unread-notifications", middleware, handler.FindUnreadNotifCount)
	route.Get("/user/:username", middleware, handler.FindByUsername)
	route.Post("/user/make-friend-requests/:target_id", middleware, handler.MakeFriendRequest)
	route.Put("/user/read-notifications", middleware, handler.ReadNotifications)
	route.Put("/user/:id", middleware, handler.Update)
	route.Put("/user/accept-friend-requests/:target_id", middleware, handler.UpdateFriendRequest)
	route.Put("/user/change-password", middleware, handler.ChangePassword)
	route.Delete("/user/reject-friend-requests/:target_id", middleware, handler.RejectFriendRequest)
	route.Delete("/user/unfriend/:target_id", middleware, handler.Unfriend)
}

func (h *userHandler) FindAll(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)
	filter := c.Query("filter")

	users, err := h.UserServices.FindAll(ctx, filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Showing users", users))
}

func (h *userHandler) FindByUsername(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)
	username := c.Params("username")

	user, err := h.UserServices.FindByUsername(ctx, username)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Showing user", user))
}

func (h *userHandler) FindOnlineUsers(c *fiber.Ctx) error {
	users, err := h.UserServices.FindOnlineUsers()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Showing online users", users))
}

func (h *userHandler) FindListFriend(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)
	filter := c.Query("filter")

	users, err := h.UserServices.FindListFriend(ctx, filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Showing friend lists", users))
}

func (h *userHandler) FindListFriendRequest(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)
	filter := c.Query("filter")

	users, err := h.UserServices.FindListFriendRequest(ctx, filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Showing friend lists requests", users))
}

func (h *userHandler) FindUnreadNotifCount(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)

	total, err := h.UserServices.FindUnreadNotifCount(ctx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Showing unread notif count", total))
}

func (h *userHandler) MakeFriendRequest(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)

	targetId, err := helper.GetParams(c.Params("target_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
	}

	if err := h.UserServices.MakeFriendRequest(ctx, uint(targetId)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusCreated).JSON(dto.SendSuccessfulResponse("Friend Request Created", nil))
}

func (h *userHandler) UpdateFriendRequest(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)

	targetId, err := helper.GetParams(c.Params("target_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
	}

	if err := h.UserServices.UpdateFriendRequest(ctx, uint(targetId)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Friend Request Updated", nil))
}

func (h *userHandler) Update(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId, err := helper.GetParams(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
	}

	var user dto.UpdateUserRequest
	if err := c.BodyParser(&user); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	userToken := c.Locals("user").(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)
	userIDJwt := uint(claims["ID"].(float64))

	user.ID = userIDJwt

	oldUser, err := h.UserServices.FindById(ctx, userId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse("User tidak ditemukan"))
	}

	var newProfilePicture string
	image, err := c.FormFile("profile_picture")

	if err == nil {
		newProfilePicture = fmt.Sprintf("%d_%s", time.Now().Unix(), image.Filename)
		if err := c.SaveFile(image, "./public/users/"+newProfilePicture); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse("Gagal simpan image baru"))
		}

		if oldUser.ProfilePicture != "" {
			oldFileName := filepath.Base(oldUser.ProfilePicture)
			_ = os.Remove("./public/users/" + oldFileName)
		}
		user.ProfilePicture = &newProfilePicture
	}

	validateErr := helper.Validate(user)
	if validateErr != nil {
		if err == nil {
			_ = os.Remove("./public/users/" + *user.ProfilePicture)
		}
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponseWithData("Validation Failed", validateErr))
	}

	result, err := h.UserServices.Update(ctx, userId, &user)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}

		if errors.Is(err, helper.ErrNotAllowed) {
			return c.Status(fiber.StatusForbidden).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	finalUser, err := h.UserServices.FindById(ctx, result.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("User Updated", finalUser))
}

func (h *userHandler) ReadNotifications(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)

	if err := h.UserServices.UpdateReadNotifications(ctx); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Notification Readed Successfully", nil))
}

func (h *userHandler) ChangePassword(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userToken := c.Locals("user").(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)
	userID := uint(claims["ID"].(float64))

	var password dto.ChangePasswordRequest
	if err := c.BodyParser(&password); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(dto.SendErrorResponse(err.Error()))
	}

	password.UserId = userID

	validateErr := helper.Validate(password)
	if validateErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponseWithData("Validation Failed", validateErr))
	}

	err := h.UserServices.ChangePassword(ctx, userID, password)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}

		if errors.Is(err, helper.ErrNotAllowed) {
			return c.Status(fiber.StatusForbidden).JSON(dto.SendErrorResponse(err.Error()))
		}

		if errors.Is(err, helper.ErrPasswordNotMatch) {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}

		if errors.Is(err, helper.ErrOldPassNotMatch) {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Password Updated", nil))
}

func (h *userHandler) RejectFriendRequest(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)

	targetId, err := helper.GetParams(c.Params("target_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
	}

	if err := h.UserServices.RejectFriendRequest(ctx, uint(targetId)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Friend Request Rejected", nil))
}

func (h *userHandler) Unfriend(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)

	targetId, err := helper.GetParams(c.Params("target_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
	}

	if err := h.UserServices.Unfriend(ctx, uint(targetId)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Unfriend Succesfully", nil))
}
