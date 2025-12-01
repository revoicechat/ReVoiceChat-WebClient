/** @typedef {ServerCategory|ServerRoom} ServerItem */

class ServerRepresentation {
  /** @type {string} */
  id
  /** @type {string} */
  name
  /** @type {string} */
  owner
}

/**
 * for "SERVER_UPDATE" notifications
 */
class ServerUpdateNotification {
  /** @type {ServerRepresentation} */
  server
  /** @type {NotificationActionType} */
  action
}

/**
 * for "NEW_USER_IN_SERVER" notifications
 */
class NewUserInServer {
  /** @type {string} */
  server
  /** @type {string} */
  user
}

class ServerCategory {
  /** @type {string} */
  name
  /** @type {ServerItem[]} */
  items
}

class ServerRoom {
  /** @type {string} */
  id
}

class ServerStructure {
  /** @type {ServerItem[]} */
  items
}