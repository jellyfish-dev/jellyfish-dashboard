import { REFETCH_ON_MOUNT, REFETCH_ON_SUCCESS, HLS_DISPLAY } from "./App";
import { ThemeSelector } from "../components/ThemeSelector";
import { GiHamburgerMenu } from "react-icons/gi";
import { LogSelector, PersistentInput, PersistentExtras, extraSelectorAtom } from "../components/LogSelector";
import { JellyfishServer, ServerProps } from "./JellyfishServer";
import { useState } from "react";
import { CloseButton } from "../components/CloseButton";
import { useAtom } from "jotai";
import HLSPlayback from "../components/HLSPlayback";

export const LOCAL_STORAGE_HOST_KEY = "host";
export const LOCAL_STORAGE_PROTOCOL_KEY = "signaling-protocol";
export const LOCAL_STORAGE_PATH_KEY = "signaling-path";
export const DEFAULT_HOST = "localhost:5002";
export const DEFAULT_PROTOCOL = "ws";
export const DEFAULT_PATH = "/socket/peer/websocket";
export const DEFAULT_TOKEN = "development";

export const Drawer = () => {
  const [HLS] = useAtom(extraSelectorAtom(HLS_DISPLAY));
  const [host, setHost] = useState<string | null>(DEFAULT_HOST);
  const [protocol, setProtocol] = useState<string | null>(DEFAULT_PROTOCOL);
  const [path, setPath] = useState<string | null>(DEFAULT_PATH);
  const [serverToken, setServerToken] = useState<string | null>(DEFAULT_TOKEN); // `ws` or `wss

  const [activeHost, setActiveHost] = useState<string | null>(null);
  const [jellyfishServers, setJellyfishServers] = useState<Map<string, ServerProps>>(new Map());
  const [refetchDemand, setRefetchDemand] = useState<boolean>(false);

  return (
    <div className="drawer">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content ml-3 flex flex-row">
        <label htmlFor="my-drawer" className="btn drawer-button mr-3">
          <GiHamburgerMenu size={24} />
        </label>
        {/*  Open drawer*/}
        {/*</label>*/}
        <div className="flex flex-col justify-start">
          <div className="flex  mt-3 flex-row">{HLS && <HLSPlayback />}</div>
          <div className="tabs tabs-boxed gap-2 mt-5 mx-1 mb-1">
            {Array.from(jellyfishServers.values()).map((server) => {
              return (
                <div key={server.host} className="indicator">
                  <CloseButton
                    position="left"
                    onClick={() => {
                      setJellyfishServers(
                        new Map(Array.from(jellyfishServers.entries()).filter(([key]) => key !== server.host)),
                      );
                    }}
                  />
                  <a
                    className={`tab bg-gray-50 text-gray-500 hover:text-black tab-bordered tab-lg ${
                      server.host === activeHost ? "tab-active" : ""
                    }`}
                    onClick={() => {
                      console.log("set active host", server.host, activeHost);
                      setActiveHost(server.host);
                    }}
                  >
                    {server.host}
                  </a>
                </div>
              );
            })}
          </div>
          <div className="flex flex-row m-1 h-full items-start">
            {Array.from(jellyfishServers.values()).map((server) => (
              <JellyfishServer key={server.host} {...server} active={server.host === activeHost} />
            ))}
          </div>
        </div>
        {/* Page content here */}
      </div>
      <div className="drawer-side z-50">
        <label htmlFor="my-drawer" className="drawer-overlay"></label>

        <div className="menu p-4 w-80 min-h-full h-fit bg-base-200 text-base-content">
          {/* Sidebar content here */}
          <div className="flex flex-col justify-start items-center">
            <div className="flex flex-col justify-start items-center w-5/6">
              <div className="flex flex-row justify-between m-1 w-full">
                <button
                  className="btn btn-sm btn-info m-1"
                  onClick={() => {
                    setRefetchDemand(true);
                  }}
                >
                  Refetch all servers
                </button>
                <ThemeSelector />
              </div>
              <div
                data-tip="Jellyfish server token"
                className="form-control m-1 flex flex-row items-center tooltip tooltip-info tooltip-right w-full"
              >
                <input
                  type="text"
                  placeholder="Jellyfish server token"
                  className="input input-bordered w-full max-w-xs"
                  value={serverToken || ""}
                  onChange={(event) => {
                    setServerToken(event.target.value);
                  }}
                />
              </div>
              <div
                data-tip="Signaling protocol"
                className="form-control m-1 flex tooltip tooltip-info tooltip-right flex-row items-center w-full"
              >
                <input
                  type="text"
                  placeholder="Protocol"
                  className="input input-bordered w-full max-w-xs"
                  value={protocol || ""}
                  onChange={(event) => {
                    setProtocol(event.target.value);
                  }}
                />
              </div>
              <div
                data-tip="Jellyfish server"
                className="form-control m-1 tooltip tooltip-info tooltip-right flex flex-row items-center w-full"
              >
                <input
                  type="text"
                  placeholder="Jellyfish host"
                  className="input input-bordered w-full max-w-xs"
                  value={host || ""}
                  onChange={(event) => {
                    setHost(event.target.value);
                  }}
                />
              </div>

              <div
                data-tip="Signaling path"
                className="form-control tooltip tooltip-info tooltip-right m-1 flex flex-row items-center w-full"
              >
                <input
                  type="text"
                  placeholder="Signaling path"
                  className="input input-bordered w-full max-w-xs"
                  value={path || ""}
                  onChange={(event) => {
                    setPath(event.target.value);
                  }}
                />
              </div>
              <button
                className="btn btn-sm btn-accent m-1"
                onClick={() => {
                  setServerToken(DEFAULT_TOKEN);
                  setHost(DEFAULT_HOST);
                  setPath(DEFAULT_PATH);
                  setProtocol(DEFAULT_PROTOCOL);
                }}
              >
                Restore default
              </button>
              <button
                className="btn btn-sm btn-accent m-1"
                onClick={() => {
                  if (host && protocol && path && serverToken) {
                    setJellyfishServers(
                      new Map(
                        jellyfishServers.set(host, {
                          host,
                          protocol,
                          path,
                          serverToken,
                          refetchDemand,
                          active: activeHost === host,
                        }),
                      ),
                    );
                    setActiveHost(host);
                  }
                }}
              >
                Connect to server
              </button>
            </div>
            <div className="flex justify-items-start w-5/6 flex-row">
              <div className="w-1/2">
                <PersistentExtras name={HLS_DISPLAY} />
              </div>
            </div>
            <div className="flex justify-items-start w-5/6 flex-row">
              <div className="w-1/2">
                <PersistentInput name={REFETCH_ON_SUCCESS} />
              </div>
              <div className="w-1/2">
                <PersistentInput name={REFETCH_ON_MOUNT} />
              </div>
            </div>

            <div className="flex w-full justify-evenly flex-row"></div>
            <LogSelector />
          </div>
        </div>
      </div>
    </div>
  );
};
