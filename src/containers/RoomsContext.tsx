import { createContext, ReactNode, useContext, useReducer } from "react";
import { groupBy } from "rambda";
import { Peer as PeerApi, Room as RoomAPI } from "../server-sdk";
import { create, CreateJellyfishClient } from "@jellyfish-dev/react-client-sdk";
import { LocalTrack } from "./Client";
import { NEW_CLIENT_CREATE_CONFIG } from "../config";

export type RoomContext = {
  state: AppStore;
  dispatch: (action: RoomActions) => void;
};

const RoomsContext = createContext<RoomContext | undefined>(undefined);

type Props = {
  children: ReactNode;
};

export type PeerState = {
  id: string;
  peerStatus: PeerApi;
  client: CreateJellyfishClient<unknown, unknown>;
  tracks: Record<string, LocalTrack>;
};

export type RoomState = {
  roomStatus: RoomAPI;
  id: string;
  peers: Record<string, PeerState>;
};

type RoomActions =
  | { type: "SET_PEERS"; peers: unknown }
  | { type: "UPDATE_ROOMS"; rooms: RoomAPI[] }
  | { type: "UPDATE_ROOM"; room: RoomAPI }
  | { type: "ADD_TRACK"; roomId: string; peerId: string; track: LocalTrack }
  | { type: "SET_ACTIVE_ROOM"; roomId: string }
  | { type: "REMOVE_ROOMS" }
  | { type: "SET_SHOW_METADATA"; roomId: string; peerId: string; trackId: string; isOpen: boolean }
  | { type: "SET_TRACK_ENABLE"; roomId: string; peerId: string; trackId: string; enable: boolean }
  | { type: "REMOVE_TRACK"; roomId: string; peerId: string; trackId: string }
  | { type: "RESET_PEER"; roomId: string; peerId: string }
  | { type: "SET_TRACK_STREAMED"; roomId: string; peerId: string; trackId: string; serverId?: string };

export type AppStore = {
  rooms: Record<string, RoomState>;
  selectedRoom: string | null;
};

const deepCopyStateWithoutTracks = (state: AppStore, roomId: string, peerId: string): AppStore => ({
  ...state,
  rooms: {
    ...state.rooms,
    [roomId]: {
      ...state.rooms[roomId],
      peers: {
        ...state.rooms[roomId].peers,
        [peerId]: {
          ...state.rooms[roomId].peers[peerId],
          tracks: {},
        },
      },
    },
  },
});

const deepCopyState = (state: AppStore, roomId: string, peerId: string, trackId: string): AppStore => ({
  ...state,
  rooms: {
    ...state.rooms,
    [roomId]: {
      ...state.rooms[roomId],
      peers: {
        ...state.rooms[roomId].peers,
        [peerId]: {
          ...state.rooms[roomId].peers[peerId],
          tracks: {
            ...state.rooms[roomId].peers[peerId].tracks,
            [trackId]: { ...state.rooms[roomId].peers[peerId].tracks[trackId] },
          },
        },
      },
    },
  },
});

type Reducer = (state: AppStore, action: RoomActions) => AppStore;
const DEFAULT_ROOM_STATE: AppStore = { rooms: {}, selectedRoom: null };

const roomReducer: Reducer = (state, action) => {
  if (action.type === "UPDATE_ROOMS") {
    const mappedRooms: RoomState[] = action.rooms.map((room) => ({
      roomStatus: room,
      id: room.id,
      peers: state.rooms[room.id]?.peers || null,
    }));

    mappedRooms.forEach((room) => {
      Object.values(room.peers || []).forEach((peer) => {
        peer.tracks = state.rooms[room.id].peers[peer.id].tracks || [];
      });
    });

    const groupedRooms: Record<string, RoomState[]> = groupBy((room) => room.id, mappedRooms);
    const rooms = Object.fromEntries(Object.entries(groupedRooms).map(([key, value]) => [key, value[0]]));

    const selectedRoom = state.selectedRoom && rooms[state.selectedRoom] ? state.selectedRoom : action?.rooms[0]?.id;

    return { rooms, selectedRoom };
  } else if (action.type === "REMOVE_ROOMS") {
    return DEFAULT_ROOM_STATE;
  } else if (action.type === "SET_ACTIVE_ROOM") {
    return { rooms: state.rooms, selectedRoom: action.roomId };
  } else if (action.type === "UPDATE_ROOM") {
    const roomId = action.room.id;
    const prevRoom = state?.rooms[roomId];
    const prevPeers = prevRoom?.peers;

    const peersList: PeerState[] = action.room.peers.map((peer) => ({
      id: peer.id,
      peerStatus: peer,
      client: prevPeers?.[peer.id]?.client || create<unknown, unknown>(NEW_CLIENT_CREATE_CONFIG),
      tracks: prevPeers?.[peer.id]?.tracks || [],
    }));

    const groupedPeers = groupBy((peer) => peer.id, peersList);
    const peersRecord = Object.fromEntries(Object.entries(groupedPeers).map(([key, value]) => [key, value[0]]));

    return {
      ...state,
      rooms: { ...state.rooms, [roomId]: { ...prevRoom, roomStatus: action.room, peers: peersRecord } },
    };
  } else if (action.type === "ADD_TRACK") {
    const { roomId, peerId } = action;
    const newState = deepCopyState(state, roomId, peerId, action.track.id);
    newState.rooms[roomId].peers[peerId].tracks[action.track.id] = action.track;
    return newState;
  } else if (action.type === "SET_SHOW_METADATA") {
    const { roomId, peerId, trackId } = action;
    const newState = deepCopyState(state, roomId, peerId, trackId);
    newState.rooms[roomId].peers[peerId].tracks[trackId].isMetadataOpened = action.isOpen;
    return newState;
  } else if (action.type === "REMOVE_TRACK") {
    const { roomId, peerId, trackId } = action;
    const newState = deepCopyState(state, roomId, peerId, trackId);
    delete newState.rooms[roomId].peers[peerId].tracks[trackId];
    return newState;
  } else if (action.type === "RESET_PEER") {
    const { roomId, peerId } = action;
    Object.values(state.rooms[roomId].peers[peerId].tracks).forEach((localTrack) => {
      localTrack.stream.getTracks().forEach((track) => {
        track.stop();
      });
    });
    return deepCopyStateWithoutTracks(state, roomId, peerId);
  } else if (action.type === "SET_TRACK_ENABLE") {
    const { roomId, peerId, trackId, enable } = action;
    const newState = deepCopyState(state, roomId, peerId, trackId);
    const track = newState.rooms[roomId].peers[peerId].tracks[trackId];
    track.enabled = enable;
    track.track.enabled = enable;
    return newState;
  } else if (action.type === "SET_TRACK_STREAMED") {
    const { roomId, peerId, trackId, serverId } = action;
    const newState = deepCopyState(state, roomId, peerId, trackId);
    const track = newState.rooms[roomId].peers[peerId].tracks[trackId];
    track.serverId = serverId;
    return newState;
  }

  throw Error("Unhandled room reducer action!");
};

export const RoomsContextProvider = ({ children }: Props) => {
  const [state, dispatch] = useReducer<Reducer, AppStore>(roomReducer, DEFAULT_ROOM_STATE, () => DEFAULT_ROOM_STATE);

  return <RoomsContext.Provider value={{ state, dispatch }}>{children}</RoomsContext.Provider>;
};

export const useStore = (): RoomContext => {
  const context = useContext(RoomsContext);
  if (!context) throw new Error("useRoomsContext must be used within a RoomsContextProvider");
  return context;
};
