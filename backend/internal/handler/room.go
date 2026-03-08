package handler

import (
	"chatapp/core"
	"chatapp/dto"
	"chatapp/internal/helper"
	"context"
	"errors"
	"fmt"
	"os"
	"time"

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
	router.Get("/api/room/:id/active-members-count", handler.GetActiveMemberCount)
	router.Get("/api/room/:id/all-members-count", handler.GetMemberCount)

	route := router.Group("/api", middleware)
	route.Get("/room", handler.FindAll)
	route.Get("/room/:id", handler.FindById)
	route.Get("/room/:id/members", handler.GetAllRoomMember)
	route.Get("/room/:id/history", handler.TakeChatHistory)
	route.Get("/room/:id/private", handler.GetPrivateRoom)
	route.Post("/room", handler.CreateRoom)
	route.Post("/room/:id/private", handler.MakePrivateRoom)
	route.Post("room/:id/join", handler.JoinRoom)
	route.Post("room/:id/add-member", handler.AddMember)
	route.Put("/room/:id", handler.UpdateRoom)
	route.Put("/room/:id/read", handler.UpdateLastReadMessages)
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

func (h *roomHandler) GetPrivateRoom(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id").(uint)
	targetId, err := helper.GetParams(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
	}

	roomId, err := h.roomServices.GetPrivateRoom(ctx, userId, targetId)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusCreated).JSON(dto.SendSuccessfulResponse("Private Room ID Found", roomId))
}

func (h *roomHandler) MakePrivateRoom(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id").(uint)
	targetId, err := helper.GetParams(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
	}

	if err := h.roomServices.MakePrivateRoom(ctx, userId, targetId); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusCreated).JSON(dto.SendSuccessfulResponse("Room private created", nil))
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

func (h *roomHandler) UpdateLastReadMessages(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)
	roomId := c.Params("id")

	if err := h.roomServices.UpdateLastReadMessages(ctx, roomId); err != nil {
		if errors.Is(err, helper.ErrNotAllowed) {
			return c.Status(fiber.StatusForbidden).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusCreated).JSON(dto.SendSuccessfulResponse("Messages Readed", nil))
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

func (h *roomHandler) GetActiveMemberCount(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	roomId := c.Params("id")
	memberCount, err := h.roomServices.GetActiveMemberCount(ctx, roomId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Showing result count", memberCount))
}

func (h *roomHandler) GetMemberCount(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	roomId := c.Params("id")
	memberCount, err := h.roomServices.GetMemberCount(ctx, roomId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Showing result count", memberCount))
}

func (h *roomHandler) JoinRoom(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id").(uint)
	roomId := c.Params("id")

	ctx = context.WithValue(ctx, "user_id", userId)

	if err := h.roomServices.JoinRoom(ctx, roomId); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))

	}

	return c.Status(fiber.StatusCreated).JSON(dto.SendSuccessfulResponse("Member Added", nil))
}

func (h *roomHandler) AddMember(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	roomId := c.Params("id")
	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)

	targetIdStr := c.Query("target_id")
	targetId := helper.StringToUint(targetIdStr)

	if err := h.roomServices.AddMember(ctx, roomId, targetId); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))

	}

	return c.Status(fiber.StatusCreated).JSON(dto.SendSuccessfulResponse("Member Added", nil))
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
	timeStr := c.Params("last_timestamp")

	var lastTimeStamp time.Time
	if timeStr != "" {
		t, err := time.Parse(time.RFC3339, timeStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format waktu salah"})
		}
		lastTimeStamp = t
	}

	messages, err := h.roomServices.TakeChatHistory(ctx, roomId, takeLimit, lastTimeStamp)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Showing Messages", messages))
}
