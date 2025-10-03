import User from "../models/user.js";
import Message from "../models/message.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";

// Get all users except the logged in user
export const getUsersForSidebar = async (req, res) => {
    try {
        const userId = req.user._id;
        const filteredUsers = await User.find({ _id: { $ne: userId } }).select("-password");

        // count of unseen messages from each user
        const unseenMessages ={}
        const promises = filteredUsers.map(async (user) => {
            const messages = await Message.find({ senderId: user._id, receiverId: userId, seen: false });
            if(messages.length > 0){
                unseenMessages[user._id] = messages.length;
            }
        });
        await Promise.all(promises);
        res.json({success: true, users: filteredUsers, unseenMessages });

    } catch (error) {
         console.log(error.message);
           res.json({success: false, message: error.message});
    }
};

// Get all messages for selected user
export const getMessages = async (req, res) => {
    try {
       
        const { id: selectedUserId } = req.params;
        const myId = req.user._id;
        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: selectedUserId },
                { senderId: selectedUserId, receiverId: myId }
            ]
        }).sort({ createdAt: 1 }); // Sort messages by creation time in ascending order

        // Mark messages as seen
        await Message.updateMany({ senderId: selectedUserId, receiverId: myId, seen: false }, { $set: { seen: true } });
        res.json({success: true, messages });
    } catch (error) {
         console.log(error.message);
           res.json({success: false, message: error.message});
    }
};

// api to mark message as seen using message id
export const markMessageAsSeen = async (req, res) => {
    try {
        const { id } = req.params;
        await Message.findByIdAndUpdate(id, { seen: true });
        res.json({success: true });

    } catch (error) {
            console.log(error.message);
              res.json({success: false, message: error.message});
    }
};


// Send message to selected user

export const sendMessage = async (req, res) => {
  const senderId = req.user._id;
  const receiverId = req.params.id;
  const { text, image } = req.body;

  try {
   if (!text?.trim() && !image?.trim()) {
      return res.status(400).json({ success: false, message: "Message or image is required" });
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
      image,
    });

    // ✅ Emit to receiver if online
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive-message", {
        senderId,
        text,
        image,
        _id: newMessage._id,
        createdAt: newMessage.createdAt,
      });
    }

    res.status(201).json({ success: true, newMessage });
  } catch (error) {
    console.error("Send message error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
