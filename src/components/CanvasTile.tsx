import VideoPlayer from "./VideoPlayer";
import { StreamInfo } from "./StreamingDeviceSelector";
import { VideoTrackInfo } from "./VideoTrackInfo";

type Props = {
  label: string;
  selected: boolean;
  streamInfo: StreamInfo;
};

export const CanvasTile = ({ selected, streamInfo }: Props) => (
  <div className="flex flex-col w-20 indicator">
    {selected && <span className="indicator-item badge badge-success badge-lg"></span>}
    <VideoPlayer stream={streamInfo.stream} />
    <VideoTrackInfo track={streamInfo.stream?.getVideoTracks()[0]} />
  </div>
);
