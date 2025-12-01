/**
 * @typedef {"ONLINE"|"AWAY"|"OFFLINE"} ActiveStatus
 * @typedef {"ADMIN"|"USER"|"BOT"} UserType
 */

class UserRepresentation {
  /** @type {string} */
  id
  /** @type {string} */
  displayName
  /** @type {string} */
  login
  createdDate
  /** @type {ActiveStatus} */
  status
  /** @type {UserType} */
  type
}

/**
 * for "USER_STATUS_UPDATE" notifications
 */
class UserStatusUpdate {
  /** @type {string} */
  userId
  /** @type {ActiveStatus} */
  status
}

/**
 * for "STREAM_START" and "STREAM_STOP" notifications
 */
class StreamRepresentation {
  /** @type {string} */
  user
  /** @type {string} */
  name
}

/**
 * for "STREAM_LEAVE" and "STREAM_JOIN" notifications
 */
class ViewerRepresentation {
  /** @type {string} */
  streamer
  /** @type {string} */
  streamName
  /** @type {string} */
  viewer
}

/**
 * for "VOICE_LEAVING" and "VOICE_LEAVING" notifications
 */
class VoiceNotification {
  /** @type {string} */
  user
  /** @type {string} */
  roomId
}

class UserNotificationRepresentation {
  /** @type {string} */
  id
  /** @type {string} */
  displayName
}