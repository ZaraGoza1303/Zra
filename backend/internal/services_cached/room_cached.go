package services_cached

import (
	"chatapp/core"
	"chatapp/dto"
	"context"
	"encoding/json"
	"log"
	"mime/multipart"
	"time"

	"github.com/redis/go-redis/v9"
)

type cachedRoomServices struct {
	roomServices core.RoomServices
	rdb          *redis.Client
}

func NewCachedRoomServices(roomServices core.RoomServices, rdb *redis.Client) core.RoomServices {
	return &cachedRoomServices{
		roomServices: roomServices,
		rdb:          rdb,
	}
}

// FindAll implements [core.RoomServices].
func (r *cachedRoomServices) FindAll(ctx context.Context, filter string) ([]dto.RoomResponse, error) {
	return nil, nil
}

// FindById implements [core.RoomServices].
func (r *cachedRoomServices) FindById(ctx context.Context, room_id string) (*dto.RoomResponse, error) {
	return nil, nil
}

// FindRoomPreview implements [core.RoomServices].
func (r *cachedRoomServices) FindRoomPreview(ctx context.Context, room_link string) (*dto.RoomResponse, error) {
	return nil, nil
}

// FindMutualRooms implements [core.RoomServices].
func (r *cachedRoomServices) FindMutualRooms(ctx context.Context, target_id uint) ([]dto.RoomResponse, error) {
	panic("unimplemented")
}

// CreateRoom implements [core.RoomServices].
func (r *cachedRoomServices) CreateRoom(ctx context.Context, room dto.RoomCreateRequest) error {
	return nil
}

// Update implements [core.RoomServices].
func (r *cachedRoomServices) Update(ctx context.Context, room_id string, roomReq *dto.RoomUpdateRequest) error {
	return nil
}

// Delete implements [core.RoomServices].
func (r *cachedRoomServices) Delete(ctx context.Context, room_id string) error {
	return nil
}

// IsMember implements [core.RoomServices].
func (r *cachedRoomServices) IsMember(room_id string, user_id uint) (bool, error) {
	return false, nil
}

// FindAllStickers implements [core.RoomServices].
func (r *cachedRoomServices) FindAllStickers(ctx context.Context, filter string, category string) ([]dto.StickerResponse, error) {
	return r.roomServices.FindAllStickers(ctx, filter, category)
}

// GetAllRoomMembers implements [core.RoomServices].
func (r *cachedRoomServices) GetAllRoomMembers(ctx context.Context, room_id string) ([]dto.RoomMemberResponse, error) {
	cacheKey := "room:members:" + room_id

	val, err := r.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var members []dto.RoomMemberResponse
		json.Unmarshal([]byte(val), &members)
		return members, nil
	}

	members, err := r.roomServices.GetAllRoomMembers(ctx, room_id)
	if err != nil {
		return nil, err
	}

	data, _ := json.Marshal(members)
	r.rdb.Set(ctx, cacheKey, data, 5*time.Minute)

	return members, nil
}

// GetPrivateRoom implements [core.RoomServices].
func (r *cachedRoomServices) GetPrivateRoom(ctx context.Context, user_id uint, target_id uint) (string, error) {
	return "", nil
}

// MakePrivateRoom implements [core.RoomServices].
func (r *cachedRoomServices) MakePrivateRoom(ctx context.Context, user_id uint, target_id uint) (string, error) {
	return "", nil
}

// SendImage implements [core.RoomServices].
func (r *cachedRoomServices) SendImage(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return r.roomServices.SendImage(ctx, fileHeader)
}

// TakeChatHistory implements [core.RoomServices].
func (r *cachedRoomServices) TakeChatHistory(ctx context.Context, room_id string, limit int, lastTimeStamp time.Time) ([]dto.Message, error) {
	return nil, nil
}

// TakeMediaMessages implements [core.RoomServices].
func (r *cachedRoomServices) TakeMediaMessages(ctx context.Context, roomId string, limit int, cursor time.Time) (*dto.MediaResponse, error) {
	return nil, nil
}

// KickUser implements [core.RoomServices].
func (r *cachedRoomServices) KickUser(ctx context.Context, room_id string, target_id uint) error {
	return nil
}

// RemoveMessage implements [core.RoomServices].
func (r *cachedRoomServices) RemoveMessage(ctx context.Context, msgId string) error {
	return r.roomServices.RemoveMessage(ctx, msgId)
}

// RemoveMultipleMessages implements [core.RoomServices].
func (r *cachedRoomServices) RemoveMultipleMessages(ctx context.Context, req dto.MultipleMsgDeleteReq) error {
	return r.roomServices.RemoveMultipleMessages(ctx, req)
}

// JoinRoom implements [core.RoomServices].
func (r *cachedRoomServices) JoinRoom(ctx context.Context, room_id string) error {
	err := r.roomServices.JoinRoom(ctx, room_id)
	if err != nil {
		return err
	}

	r.InvalidateMemberCache(ctx, room_id)
	return nil
}

// LeaveRoom implements [core.RoomServices].
func (r *cachedRoomServices) LeaveRoom(ctx context.Context, room_id string) error {
	err := r.roomServices.LeaveRoom(ctx, room_id)
	if err != nil {
		return err
	}

	r.InvalidateMemberCache(ctx, room_id)
	return nil
}

// AddMember implements [core.RoomServices].
func (r *cachedRoomServices) AddMember(ctx context.Context, room_id string, target_id uint) error {
	err := r.roomServices.AddMember(ctx, room_id, target_id)
	if err != nil {
		return err
	}

	r.InvalidateMemberCache(ctx, room_id)
	return nil
}

// MakeAdmin implements [core.RoomServices].
func (r *cachedRoomServices) MakeAdmin(ctx context.Context, room_id string, target_id uint) error {
	return nil
}

// UpdateLastReadMessages implements [core.RoomServices].
func (r *cachedRoomServices) UpdateLastReadMessages(ctx context.Context, room_id string) error {
	return nil
}

// UpdateMessage implements [core.RoomServices].
func (r *cachedRoomServices) UpdateMessage(ctx context.Context, msgId string, req *dto.MessageUpdateRequest) error {
	return r.roomServices.UpdateMessage(ctx, msgId, req)
}

// FindMessageByID implements [core.RoomServices].
func (r *cachedRoomServices) FindMessageByID(ctx context.Context, message_id string) (*dto.Message, error) {
	return r.roomServices.FindMessageByID(ctx, message_id)
}

// GetActiveMemberCount implements [core.RoomServices].
func (r *cachedRoomServices) GetActiveMemberCount(ctx context.Context, room_id string) (int64, error) {
	return 0, nil
}

// GetActiveMembers implements [core.RoomServices].
func (r *cachedRoomServices) GetActiveMembers(room_id string) ([]uint, error) {
	return nil, nil
}

// GetAllRoomMembersByUserId implements [core.RoomServices].
func (r *cachedRoomServices) GetAllRoomMembersByUserId(ctx context.Context, user_id uint) ([]uint, error) {
	return r.roomServices.GetAllRoomMembersByUserId(ctx, user_id)
}

// OnlineUsers implements [core.RoomServices].
func (r *cachedRoomServices) OnlineUsers(ctx context.Context, room_id string) ([]uint, error) {
	return nil, nil
}

// GetMemberCount implements [core.RoomServices].
func (r *cachedRoomServices) GetMemberCount(ctx context.Context, room_id string) (int64, error) {
	return 0, nil
}

// SaveMessage implements [core.RoomServices].
func (r *cachedRoomServices) SaveMessage(msg dto.Message) error {
	return nil
}

func (r *cachedRoomServices) InvalidateMemberCache(ctx context.Context, room_id string) {
	if err := r.rdb.Del(ctx, "room:members:"+room_id).Err(); err != nil {
		log.Printf("Failed to invalidate cache for room %s: %v", room_id, err)
	}
}
