package handler

import (
	"chatapp/core"
	"chatapp/dto"
	"chatapp/internal/helper"
	"context"
	"errors"
	"fmt"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type roomHandler struct {
	roomServices core.RoomServices
}

func NewRoom(router fiber.Router, roomService core.RoomServices, middleware fiber.Handler) {
	handler := roomHandler{roomServices: roomService}
	router.Get("/api/room/:room_link/preview", handler.FindRoomPreview)

	route := router.Group("/api", middleware)
	route.Get("/room", handler.FindAll)
	route.Get("/room/:id", handler.FindById)
	route.Get("/room/:id/members", handler.GetAllRoomMember)
	route.Get("/room/:id/history", handler.TakeChatHistory)
	route.Post("/room", handler.CreateRoom)
	route.Post("room/:id/join", handler.JoinRoom)
	route.Put("/room/:id", handler.UpdateRoom)
	route.Put("/room/:id/to-admin", handler.MakeAdmin)
	route.Delete("/room/:id", handler.DeleteRoom)
	route.Delete("/room/:id/kick", handler.KickUser)
	route.Delete("/room/:id/leave", handler.LeaveRoom)
}

func (h *roomHandler) FindAll(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)
	filter := c.Query("search")

	rooms, err := h.roomServices.FindAll(ctx, filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Showing Data", rooms))

}

func (h *roomHandler) FindById(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)
	roomId := c.Params("id")

	room, err := h.roomServices.FindById(ctx, roomId)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(dto.SendErrorResponse(err.Error()))
		}

		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Showing Data", room))
}

func (h *roomHandler) FindRoomPreview(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()
	roomLink := c.Params("room_link")
	room, err := h.roomServices.FindRoomPreview(ctx, roomLink)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}
	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Showing Data", room))

}

func (h *roomHandler) CreateRoom(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id").(uint)
	var roomReq dto.RoomCreateRequest
	if err := c.BodyParser(&roomReq); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))

	}

	roomReq.OwnerID = userId
	picture, err := c.FormFile("picture")
	if err == nil {
		contentType := picture.Header.Get("Content-Type")
		if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/webp" {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse("Only images are allowed (jpg/png/webp)"))
		}

		fileName := fmt.Sprintf("%s_%s", uuid.New().String(), picture.Filename)
		filePath := fmt.Sprintf("./public/rooms/%s", fileName)
		if err := c.SaveFile(picture, filePath); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
		}

		roomReq.Picture = &fileName
	}

	validateErr := helper.Validate(roomReq)
	if validateErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponseWithData("Validation Failed", validateErr))

	}

	if err := h.roomServices.CreateRoom(ctx, roomReq); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))

	}

	return c.Status(fiber.StatusCreated).JSON(dto.SendSuccessfulResponse("Room Created", nil))

}

func (h *roomHandler) UpdateRoom(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)
	roomId := c.Params("id")

	var roomReq dto.RoomUpdateRequest
	if err := c.BodyParser(&roomReq); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
	}

	existsRoom, err := h.roomServices.FindById(ctx, roomId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	picture, err := c.FormFile("picture")
	if err == nil {
		contentType := picture.Header.Get("Content-Type")
		if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/webp" {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse("Only images are allowed (jpg/png/webp)"))
		}

		fileName := fmt.Sprintf("%s_%s", uuid.New().String(), picture.Filename)
		filePath := fmt.Sprintf("./public/rooms/%s", fileName)

		if err := c.SaveFile(picture, filePath); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
		}

		if existsRoom.Picture != nil {
			_ = os.Remove("./public/rooms/" + *existsRoom.Picture)
		}

		roomReq.Picture = &fileName
	}

	validateErr := helper.Validate(roomReq)
	if validateErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponseWithData("Validation Failed", validateErr))

	}

	if err := h.roomServices.Update(ctx, roomId, &roomReq); err != nil {
		if errors.Is(err, helper.ErrNotAllowed) {
			return c.Status(fiber.StatusForbidden).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusCreated).JSON(dto.SendSuccessfulResponse("Room Updated", nil))

}

func (h *roomHandler) DeleteRoom(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)
	roomId := c.Params("id")

	if err := h.roomServices.Delete(ctx, roomId); err != nil {
		if errors.Is(err, helper.ErrNotAllowed) {
			return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Room Deleted", nil))

}

func (h *roomHandler) KickUser(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	if userId == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse("user_id not found"))
	}

	ctx = context.WithValue(ctx, "user_id", userId)

	targetUserIdStr := c.Query("user_id")
	targetId := helper.StringToUint(targetUserIdStr)

	roomId := c.Params("id")

	if err := h.roomServices.KickUser(ctx, roomId, targetId); err != nil {
		if errors.Is(err, helper.ErrNotAllowed) {
			return c.Status(fiber.StatusForbidden).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("User Kicked Successfully", nil))
}

func (h *roomHandler) GetAllRoomMember(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	roomId := c.Params("id")
	members, err := h.roomServices.GetAllRoomMembers(ctx, roomId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Showing all members in room", members))

}

func (h *roomHandler) JoinRoom(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id").(uint)
	roomId := c.Params("id")

	member := dto.RoomMemberRequest{
		RoomID: roomId,
		UserID: userId,
		Role:   "member",
	}

	if err := h.roomServices.JoinRoom(ctx, &member); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))

	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Member Added", nil))

}

func (h *roomHandler) LeaveRoom(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)
	roomId := c.Params("id")
	if err := h.roomServices.LeaveRoom(ctx, roomId); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}
	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Successfully Leave", nil))

}

func (h *roomHandler) MakeAdmin(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	if userId == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse("user_id not found"))
	}

	ctx = context.WithValue(ctx, "user_id", userId)

	targetIdStr := c.Query("user_id")
	targetId := helper.StringToUint(targetIdStr)

	roomId := c.Params("id")

	if err := h.roomServices.MakeAdmin(ctx, roomId, targetId); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("User is now Admin!", nil))
}

func (h *roomHandler) TakeChatHistory(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	roomId := c.Params("id")
	takeLimit := 20

	messages, err := h.roomServices.TakeChatHistory(ctx, roomId, takeLimit)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Showing Messages", messages))

}
