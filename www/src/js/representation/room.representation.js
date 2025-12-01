/**
 * @typedef {"TEXT"|"WEBRTC"|"VOICE"} RoomType
 */

class RoomRepresentation {
  /** @type {string} */
  id
  /** @type {string} */
  name
  /** @type {RoomType} */
  type
  /** @type {string} */
  serverId
}

/**
 * for "ROOM_UPDATE" notifications
 */
class RoomNotification {
  /** @type {RoomRepresentation} */
  room
  /** @type {NotificationActionType} */
  action
}

class MessageRepresentation {
  /** @type {string} */
  id
  /** @type {string} */
  text
  /** @type {string} */
  roomId
  /** @type {UserNotificationRepresentation} */
  user
  createdDate
  /** @type {MediaDataRepresentation[]} */
  medias
  /** @type {EmoteRepresentation[]} */
  emotes
}

class MessageNotification {
  /** @type {MessageRepresentation} */
  message
  /** @type {NotificationActionType} */
  action
}

class RoomPresence {
  /** @type {string} */
  id
  /** @type {string} */
  name
  /** @type {UserRepresentation[]} */
  allUser
  /** @type {ConnectedUserRepresentation[]} */
  connectedUser
}