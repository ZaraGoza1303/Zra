import { BACKEND_URL, ROOMS_PATH, USERS_PATH } from '../config';

export const getRoomImageUrl = (
    picturePath: string | null | undefined,
): string => {
    if (!picturePath || typeof picturePath !== 'string') return "";

    let path = picturePath.trim().replace(/^["']|["']$/g, "");

    const urlMatch = path.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
        return urlMatch[0];
    }

    if (path.startsWith(BACKEND_URL)) {
        return path;
    }

    if (path.startsWith(ROOMS_PATH)) {
        return `${BACKEND_URL}${path}`;
    }

    const filename = path.split("/").pop() || path;
    return `${BACKEND_URL}${ROOMS_PATH}${filename}`;
};

export const getUserImageUrl = (
    picturePath: string | null | undefined,
): string => {
    if (!picturePath || typeof picturePath !== 'string') return "";

    let path = picturePath.trim().replace(/^["']|["']$/g, "");

    const urlMatch = path.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
        return urlMatch[0];
    }

    if (path.startsWith(BACKEND_URL)) {
        return path;
    }

    if (path.startsWith(USERS_PATH)) {
        return `${BACKEND_URL}${path}`;
    }

    const filename = path.split("/").pop() || path;
    return `${BACKEND_URL}${USERS_PATH}${filename}`;
};
