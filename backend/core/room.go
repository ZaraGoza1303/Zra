package core

import (
	"chatapp/dto"
	"chatapp/internal/models"
	"context"
	"mime/multipart"
	"time"
)

type RoomRepositories interface {
	GetAll(ctx context.Context, filter string, user_id uint) ([]models.Room, error)
	GetById(ctx context.Context, room_id string) (*models.Room, error)
	Insert(ctx context.Context, room *models.Room) error
	Update(ctx context.Context, room_id string, roomReq *models.Room) error
	Delete(ctx context.Context, room_id string) error

	GetByLink(ctx context.Context, room_link string) (*models.Room, error)
	GetMessageByID(ctx context.Context, message_id string) (*models.Message, error)
	GetMultipleMessagesByIDs(ctx context.Context, msgIds []string) ([]models.Message, error)
	GetAllStickers(ctx context.Context, filter string, category string) ([]models.Sticker, error)
	GetAllRoomMembers(ctx context.Context, room_id string) ([]models.RoomMember, error)
	GetMutualRooms(ctx context.Context, user_id uint, target_id uint) ([]models.Room, error)
	GetIdPrivateRoom(ctx context.Context, user_id uint, target_id uint) (string, error)
	GetMemberCount(ctx context.Context, room_id string) (int64, error)
	GetLastMessages(ctx context.Context, roomIds []string) ([]models.Message, error)
	GetUnreadMessagesCount(ctx context.Context, room_id string, user_id uint) (int64, error)
	InsertPrivateRoom(ctx context.Context, room *models.Room, user_id []uint) error
	InsertRoomMembers(ctx context.Context, member *models.RoomMember) error
	IsMember(ctx context.Context, room_id string, user_id uint) (bool, error)
	IsAdmin(ctx context.Context, room_id string, user_id uint) (bool, error)
	UpdateToAdmin(ctx context.Context, room_id string, user_id uint) error
	UpdateReadMessages(ctx context.Context, room_id string, user_id uint, timeStamp time.Time) error
	UpdateMessageById(ctx context.Context, msgId string, newMsg *models.Message) error
	MarkMessageRead(ctx context.Context, room_id string, user_id uint) error
	DeleteUser(ctx context.Context, room_id string, user_id uint) error
	DeleteMessageById(ctx context.Context, msgId string) error
	DeleteMultipleMessages(ctx context.Context, msgId []string) error

	// Buat Websocket
	SaveMessage(msg models.Message) error
	GetAllRoomMembersByUserId(ctx context.Context, user_id uint) ([]uint, error)
	GetChatHistory(ctx context.Context, room_id string, limit int, lastTime time.Time) ([]models.Message, error)
}

type RoomServices interface {
	FindAll(ctx context.Context, filter string) ([]dto.RoomResponse, error)
	FindById(ctx context.Context, room_id string) (*dto.RoomResponse, error)
	CreateRoom(ctx context.Context, room dto.RoomCreateRequest) error
	Update(ctx context.Context, room_id string, roomReq *dto.RoomUpdateRequest) error
	Delete(ctx context.Context, room_id string) error

	FindRoomPreview(ctx context.Context, room_id string) (*dto.RoomResponse, error)
	FindMutualRooms(ctx context.Context, target_id uint) ([]dto.RoomResponse, error)
	FindAllStickers(ctx context.Context, filter string, category string) ([]dto.StickerResponse, error)
	GetAllRoomMembers(ctx context.Context, room_id string) ([]dto.RoomMemberResponse, error)
	GetMemberCount(ctx context.Context, room_id string) (int64, error)
	GetPrivateRoom(ctx context.Context, user_id uint, target_id uint) (string, error)
	MakePrivateRoom(ctx context.Context, user_id uint, target_id uint) (string, error)
	SendImage(ctx context.Context, fileHeader *multipart.FileHeader) (string, error)
	TakeChatHistory(ctx context.Context, room_id string, limit int, lastTimeStamp time.Time) ([]dto.Message, error)
	JoinRoom(ctx context.Context, room_id string) error
	AddMember(ctx context.Context, room_id string, user_id uint) error
	MakeAdmin(ctx context.Context, room_id string, target_id uint) error
	UpdateLastReadMessages(ctx context.Context, room_id string) error
	UpdateMessage(ctx context.Context, msgId string, req *dto.MessageUpdateRequest) error
	LeaveRoom(ctx context.Context, room_id string) error
	KickUser(ctx context.Context, room_id string, target_id uint) error
	RemoveMessage(ctx context.Context, msgId string) error
	RemoveMultipleMessages(ctx context.Context, req dto.MultipleMsgDeleteReq) error

	// Buat Websocket
	GetActiveMemberCount(ctx context.Context, room_id string) (int64, error)
	GetActiveMembers(room_id string) ([]uint, error)
	GetAllRoomMembersByUserId(ctx context.Context, user_id uint) ([]uint, error)
	FindMessageByID(ctx context.Context, message_id string) (*dto.Message, error)
	OnlineUsers(ctx context.Context, room_id string) ([]uint, error)
	IsMember(room_id string, user_id uint) (bool, error)
	SaveMessage(msg dto.Message) error
}
