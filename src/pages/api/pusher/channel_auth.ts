import { type NextApiHandler } from "next";
import { getServerAuthSession } from "~/server/auth";
import pusher from "~/server/pusher";

const ChannelAuthHandler: NextApiHandler = async (req, res) => {
  const session = await getServerAuthSession({ req, res });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { socket_id: socketId, channel_name: channelName } = req.body;

  if (!socketId || !channelName) {
    res.status(400).json({ message: "missing data" });
    return;
  }

  if (!session) {
    res.status(403).json({ message: "authentication failed" });
    return;
  }

  const userData = {
    user_id: session.user.id,
  };

  const authResponse = pusher.authorizeChannel(
    socketId as string,
    channelName as string,
    userData
  );

  res.status(200).json(authResponse);
};

export default ChannelAuthHandler;
