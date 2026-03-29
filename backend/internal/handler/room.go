package handler

import (
	"chatapp/core"
	"chatapp/dto"
	"chatapp/internal/helper"
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/h2non/filetype"
	"github.com/h2non/filetype/types"
	"gorm.io/gorm"
)

type roomHandler struct {
	roomServices      core.RoomServices
	cachedRoomService core.RoomServices
	storageService    core.StorageService
}

func NewRoom(router fiber.Router, roomService core.RoomServices, cachedRoomServices core.RoomServices, storageService core.StorageService, middleware fiber.Handler) {
	handler := roomHandler{
		roomServices:      roomService,
		cachedRoomService: cachedRoomServices,
		storageService:    storageService,
	}
	router.Get("/api/room/:room_link/preview", handler.FindRoomPreview)
	router.Get("/api/room/:id/active-members", handler.GetActiveMembers)
	router.Get("/api/room/:id/active-members-count", handler.GetActiveMemberCount)
	router.Get("/api/room/:id/all-members-count", handler.GetMemberCount)

	route := router.Group("/api", middleware)
	route.Get("/room", handler.FindAll)
	route.Get("/room/stickers", handler.FindAllStickers)
	route.Get("/room/:id", handler.FindById)
	route.Get("/room/:id/members", handler.GetAllRoomMember)
	route.Get("/room/:id/history", handler.TakeChatHistory)
	route.Get("/room/:id/media", handler.TakeMediaMessages)
	route.Get("/room/:target_id/mutual", handler.FindMutualRooms)
	route.Get("/room/:id/private", handler.GetPrivateRoom)
	route.Post("/room", handler.CreateRoom)
	route.Post("/room/upload-images", handler.UploadImages)
	route.Post("/room/upload-files", handler.UploadFiles)
	route.Post("/room/:id/private", handler.MakePrivateRoom)
	route.Post("room/:id/join", handler.JoinRoom)
	route.Post("room/:id/add-member", handler.AddMember)
	route.Put("/room/:id", handler.UpdateRoom)
	route.Put("/room/:id/message", handler.UpdateMessage)
	route.Put("/room/:id/read", handler.UpdateLastReadMessages)
	route.Put("/room/:id/to-admin", handler.MakeAdmin)
	route.Delete("/room/multiple-messages", handler.RemoveMultipleMessages)
	route.Delete("/room/:id", handler.DeleteRoom)
	route.Delete("/room/:id/message", handler.RemoveMessage)
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

func (h *roomHandler) FindMutualRooms(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	targetId, err := helper.GetParams(c.Params("target_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
	}

	ctx = context.WithValue(ctx, "user_id", userId)

	rooms, err := h.roomServices.FindMutualRooms(ctx, targetId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}
	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Showing Mutual Rooms", rooms))
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
		if picture.Size > 8*1024*1024 {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse("File Too Large"))
		}

		kind, err := helper.CheckFileType(picture)
		if err != nil || kind == filetype.Unknown {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}

		allowed := map[string]bool{
			"jpg":  true,
			"png":  true,
			"webp": true,
		}

		if !allowed[kind.Extension] {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse("Invalid Type"))
		}

		fileName, err := h.storageService.UploadFile("rooms", picture)
		if err != nil {
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
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))

	}

	return c.Status(fiber.StatusCreated).JSON(dto.SendSuccessfulResponse("Room Created", nil))
}

func (h *roomHandler) UploadImages(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	form, err := c.MultipartForm()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
	}

	files := form.File["files"]
	if len(files) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse("No files uploaded"))
	}

	maxFileSize := 10 * 1024 * 1024
	var imgUrls []string

	for _, file := range files {
		if file.Size > int64(maxFileSize) {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse("File Too Large"))
		}

		kind, err := helper.CheckFileType(file)
		if err != nil || kind == types.Unknown {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}

		allowed := map[string]bool{
			"image/jpeg": true,
			"image/png":  true,
			"image/webp": true,
			"image/gif":  true,
		}

		if !allowed[kind.MIME.Value] {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse("Invalid File Type"))
		}

		fileUrl, err := h.roomServices.UploadFile(ctx, file)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
		}

		imgUrls = append(imgUrls, fileUrl)
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Successfully Uploaded", imgUrls))
}

func (h roomHandler) UploadFiles(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	form, err := c.MultipartForm()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse("Failed to parse form"))
	}

	files := form.File["files"]
	if len(files) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse("No files uploaded"))
	}

	maxFileSize := 10 * 1024 * 1024
	var uploadedUrls []string

	allowed := map[string]bool{
		"application/pdf": true,
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
		"application/x-7z-compressed": true,
		"application/zip":             true,
	}

	for _, file := range files {
		if file.Size > int64(maxFileSize) {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse("File " + file.Filename + " is too large"))
		}

		kind, err := helper.CheckFileType(file)
		if err != nil || kind == types.Unknown || !allowed[kind.MIME.Value] {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse("Invalid file type for: " + file.Filename))
		}

		fileUrl, err := h.roomServices.UploadFile(ctx, file)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse("Failed to upload: " + file.Filename))
		}

		uploadedUrls = append(uploadedUrls, fileUrl)
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Successfully Uploaded All Files", uploadedUrls))
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

	roomId, err := h.roomServices.MakePrivateRoom(ctx, userId, targetId)
	if err != nil {
		fmt.Println("MakePrivateRoom error:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}
	return c.Status(fiber.StatusCreated).JSON(dto.SendSuccessfulResponse("Room private found or created", roomId))
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

		// Jika ada gambar lama, hapus dulu
		if existsRoom.Picture != nil {
			if err := h.storageService.RemoveFile("rooms", *existsRoom.Picture); err != nil {
				// Log error tapi tidak menghentikan proses
				fmt.Printf("Failed to remove old file: %v\n", err)
			}
		}

		// Upload gambar baru
		fileName, err := h.storageService.UploadFile("rooms", picture)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
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

func (h *roomHandler) UpdateMessage(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)
	msgId := c.Params("id")

	var msgReq dto.MessageUpdateRequest
	if err := c.BodyParser(&msgReq); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
	}

	validateErr := helper.Validate(msgReq)
	if validateErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponseWithData("Validation Failed", validateErr))
	}

	if err := h.roomServices.UpdateMessage(ctx, msgId, &msgReq); err != nil {
		if errors.Is(err, helper.ErrNotAllowed) {
			return c.Status(fiber.StatusForbidden).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Message Updated", nil))
}

func (h *roomHandler) DeleteRoom(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)
	roomId := c.Params("id")

	if err := h.roomServices.Delete(ctx, roomId); err != nil {
		if errors.Is(err, helper.ErrNotAllowed) {
			return c.Status(fiber.StatusForbidden).JSON(dto.SendErrorResponse(err.Error()))
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

func (h *roomHandler) RemoveMessage(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)
	msgId := c.Params("id")

	if err := h.roomServices.RemoveMessage(ctx, msgId); err != nil {
		if errors.Is(err, helper.ErrNotAllowed) {
			return c.Status(fiber.StatusForbidden).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Message Deleted", nil))
}

func (h *roomHandler) RemoveMultipleMessages(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)

	var req dto.MultipleMsgDeleteReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse(err.Error()))
	}

	if err := h.roomServices.RemoveMultipleMessages(ctx, req); err != nil {
		if errors.Is(err, helper.ErrNotAllowed) {
			return c.Status(fiber.StatusForbidden).JSON(dto.SendErrorResponse(err.Error()))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Message Deleted", nil))
}

func (h *roomHandler) FindAllStickers(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	filter := c.Query("search")
	category := c.Query("category")

	stickers, err := h.roomServices.FindAllStickers(ctx, filter, category)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Showing Stickers", stickers))
}

func (h *roomHandler) GetAllRoomMember(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	roomId := c.Params("id")
	userId := c.Locals("user_id")
	ctx = context.WithValue(ctx, "user_id", userId)

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

func (h *roomHandler) GetActiveMembers(c *fiber.Ctx) error {
	roomId := c.Params("id")
	members, err := h.roomServices.GetActiveMembers(roomId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Showing active user id", members))
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

	if err := h.cachedRoomService.JoinRoom(ctx, roomId); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(dto.SendErrorResponse(err.Error()))
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

	if err := h.cachedRoomService.AddMember(ctx, roomId, targetId); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(dto.SendErrorResponse(err.Error()))
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
	if err := h.cachedRoomService.LeaveRoom(ctx, roomId); err != nil {
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

func (h *roomHandler) TakeMediaMessages(c *fiber.Ctx) error {
	ctx, cancel := helper.GetCtx(c)
	defer cancel()

	roomId := c.Params("id")
	limit := 20
	cursorStr := c.Query("cursor")

	var cursor time.Time
	if cursorStr != "" {
		t, err := time.Parse(time.RFC3339, cursorStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(dto.SendErrorResponse("Wrong time format"))
		}
		cursor = t
	}

	medias, err := h.roomServices.TakeMediaMessages(ctx, roomId, limit, cursor)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.SendErrorResponse(err.Error()))
	}

	return c.Status(fiber.StatusOK).JSON(dto.SendSuccessfulResponse("Showing Media", medias))
}
