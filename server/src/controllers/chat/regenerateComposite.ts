import { Response } from "express";
import { Server } from "socket.io";
import prisma from "../../db.js";
import { AuthRequest } from "../../middleware/auth.js";
import generateComposite from "../../workers/compositeGenerator.js";

export const regenerateComposite =
  (io: Server) =>
  async (req: AuthRequest, res: Response): Promise<any> => {
    const userId = req.userId;
    const conversationId = parseInt(req.params.conversationId);

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { participants: true },
      });
      if (!conv)
        return res.status(404).json({ message: "Conversation not found" });

      // Check permission: only group owner or participants can regenerate
      const isParticipant = conv.participants.some(
        (p: any) => p.userId === userId,
      );
      if (!isParticipant) return res.status(403).json({ message: "Forbidden" });

      const result = await generateComposite(conversationId);
      if (!result)
        return res
          .status(500)
          .json({ message: "Failed to generate composite" });

      // Notify participants
      for (const p of conv.participants) {
        io.to(`user:${p.userId}`).emit("conversation_updated", {
          conversationId,
          action: "composite_updated",
          compositeAvatarUrl: result.url,
          compositeAvatarVersion: result.version,
        });
      }

      return res.json({ url: result.url, version: result.version });
    } catch (err) {
      console.error("Regenerate composite error:", err);
      return res.status(500).json({ message: "Error regenerating composite" });
    }
  };
