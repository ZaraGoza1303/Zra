package core

import (
	"chatapp/dto"
	"chatapp/internal/models"
	"context"
)

type RoomRepositories interface {
	GetAll(ctx context.Context, filter string, user_id uint) ([]models.Room, error)
	GetById(ctx context.Context, room_id string) (*models.Room, error)
	Insert(ctx context.Context, room *models.Room) error
	Update(ctx context.Context, room_id string, roomReq *models.Room) error
	Delete(ctx context.Context, room_id string) error

	GetByLink(ctx context.Context, room_link string) (*models.Room, error)
	GetAllRoomMembers(ctx context.Context, room_id string) ([]models.RoomMember, error)
	InsertRoomMembers(ctx context.Context, memmber *models.RoomMember) error
	IsMember(ctx context.Context, room_id string, user_id uint) (bool, error)
	IsAdmin(ctx context.Context, room_id string, user_id uint) (bool, error)
	UpdateToAdmin(ctx context.Context, room_id string, user_id uint) error
	DeleteUser(ctx context.Context, room_id string, user_id uint) error

	// Buat Websocket
	SaveMessage(msg models.Message) error
	GetChatHistory(ctx context.Context, room_id string, limit int) ([]models.Message, error)
}

type RoomServices interface {
	FindAll(ctx context.Context, filter string) ([]dto.RoomResponse, error)
	FindById(ctx context.Context, room_id string) (*dto.RoomResponse, error)
	CreateRoom(ctx context.Context, room dto.RoomCreateRequest) error
	Update(ctx context.Context, room_id string, roomReq *dto.RoomUpdateRequest) error
	Delete(ctx context.Context, room_id string) error

	FindRoomPreview(ctx context.Context, room_id string) (*dto.RoomResponse, error)
	GetAllRoomMembers(ctx context.Context, room_id string) ([]dto.RoomMemberResponse, error)
	TakeChatHistory(ctx context.Context, room_id string, limit int) ([]dto.Message, error)
	JoinRoom(ctx context.Context, member *dto.RoomMemberRequest) error
	MakeAdmin(ctx context.Context, room_id string, target_id uint) error
	LeaveRoom(ctx context.Context, room_id string) error
	KickUser(ctx context.Context, room_id string, target_id uint) error

	// Buat Websocket
	IsMember(room_id string, user_id uint) (bool, error)
	SaveMessage(msg dto.Message) error
}
