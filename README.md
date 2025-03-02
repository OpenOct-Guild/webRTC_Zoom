# WebRTC Video Conferencing System

A simple WebRTC-based video conferencing system with a basic HTML/CSS frontend and a Node.js backend using Socket.IO for real-time communication.

## Features
- Create and join rooms
- Video and audio streaming
- Screen sharing
- Chat messaging
- Toggle audio/video
- Admin controls (remove users)

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js, Socket.IO

## Installation

### Prerequisites
- Node.js installed

### Steps
1. Clone the repository:
   ```sh
   git clone https://github.com/OpenOct-Guild/webRTC_Zoom.git
   cd webRTC_Zoom
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Start the server:
   ```sh
   node server.js
   ```

4. Open `http://localhost:3000` in your browser.

## Folder Structure
```
📦 webrtc-video-conferencing
├── 📂 public        # Frontend files (HTML, CSS, JS)
├── 📜 server.js     # Backend logic (Express, Socket.IO)
└── 📜 package.json  # Project dependencies
```

## Usage
- Visit `http://localhost:3000`.
- Create a room or join an existing one.
- Allow access to the camera and microphone.
- Invite participants to join.

## Contributing
Feel free to submit pull requests to improve the project!

## License
This project is open-source under the MIT License.

