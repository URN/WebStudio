import React, { useState, useReducer, useEffect, memo } from "react";
import { ContextMenu, MenuItem } from "react-contextmenu";
import { useBeforeunload } from "react-beforeunload";
import { MYRADIO_NON_API_BASE } from "../api"

import {
  TimeslotItem,
} from "../api";

import {
  Droppable,
  DragDropContext,
  DropResult,
  ResponderProvided
} from "react-beautiful-dnd";

import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../rootReducer";
import {
  PlanItem,
  getShowplan,
  itemId,
  moveItem,
  addItem,
  removeItem
} from "./state";

import * as MixerState from "../mixer/state";
import * as BroadcastState from "../broadcast/state";
import { Item, TS_ITEM_MENU_ID } from "./Item";
import {
  CentralMusicLibrary,
  CML_CACHE,
  AuxLibrary,
  AUX_CACHE
} from "./libraries";
import { Player, USE_REAL_GAIN_VALUE } from "./Player";
import { MicCalibrationModal } from "../mixer/MicCalibrationModal";

import { timestampToDateTime } from "../lib/utils";
import { CombinedNavAlertBar } from "../navbar";

function Column({ id, data }: { id: number; data: PlanItem[] }) {
  return (
    <div className="sp-main-col">
      <div className="sp-col shadow">
        <Droppable droppableId={id.toString(10)}>
          {(provided, snapshot) => (
            <div
              className="sp-col-inner"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {typeof data[id] === "undefined"
                ? null
                : data
                    .filter(x => x.channel === id)
                    .sort((a, b) => a.weight - b.weight)
                    .map((x, index) => (
                      <Item
                        key={itemId(x)}
                        item={x}
                        index={index}
                        column={id}
                      />
                    ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
      <Player id={id} />
    </div>
  );
}

// TODO: this shouldn't have to be hardcoded
const AUX_LIBRARIES: { [key: string]: string } = {
  "aux-11": "Ambiences/Soundscapes",
  "aux-3": "Artist Drops",
  "aux-1": "Beds",
  "aux-7": "Daily News Bulletins",
  "aux-13": "Event Resources",
  "aux-2": "Jingles",
  "aux-4": "News",
  "aux-5": "Presenter Idents",
  "aux-6": "Promos",
  "aux-12": "Roses 2018",
  "aux-10": "Sound Effects",
  "aux-8": "Speech",
  "aux-9": "Teasers"
};

function LibraryColumn() {
  const [sauce, setSauce] = useState("None");
  return (
    <div className="sp-col" style={{ height: "48%", marginBottom: "1%" }}>
      <select
        className="form-control"
        style={{ width: "100%" }}
        value={sauce}
        onChange={e => setSauce(e.target.value)}
      >
        <option value={"None"} disabled>
          Choose a library
        </option>
        <option value={"CentralMusicLibrary"}>Central Music Library</option>
        <option disabled>Resources</option>
        {Object.keys(AUX_LIBRARIES).map(libId => (
          <option key={libId} value={libId}>
            {AUX_LIBRARIES[libId]}
          </option>
        ))}
      </select>
      <div className="border-top my-3"></div>
      {sauce === "CentralMusicLibrary" && <CentralMusicLibrary />}
      {sauce.startsWith("aux-") && <AuxLibrary libraryId={sauce} />}
      <span
        className={sauce === "None" ? "mt-5 text-center text-muted" : "d-none"}
      >
        <i className="far fa-2x fa-caret-square-down"></i>
        <br />
        Select a library to search.
      </span>
    </div>
  );
}

function MicControl() {
  const state = useSelector((state: RootState) => state.mixer.mic);
  const [micList, setMicList] = useState<MediaDeviceInfo[]>([]);
  const dispatch = useDispatch();
  const [nextMicSource, setNextMicSource] = useState("default") // next mic source
  const [lock, setLock] = useState(false)

  useEffect(()=>{
    navigator.mediaDevices.enumerateDevices()
    .then((devices)=>{
      setMicList(reduceToInputs(devices))
    })
    .catch(() => {console.log("Could not fetch devices");})
  }, [])

  function reduceToInputs(devices:MediaDeviceInfo[]){
    var temp: MediaDeviceInfo[] = []
    devices.forEach((device)=>{
      if (device.kind == "audioinput") {
        temp.push(device)
      }
    })
    return temp
  }

  function toggleCheck(){setLock(!lock)}

  return (
    <div className="sp-col" style={{ height: "48%", overflowY: "visible" }}>
      <h2>Microphone</h2>
      <button
        disabled={state.id == nextMicSource || lock}
        onClick={() => dispatch(MixerState.openMicrophone(nextMicSource))}
      >
        Open
      </button>
      <div className="custom-control custom-checkbox">
      <input className="custom-control-input" type="checkbox" id="micLock" onChange={toggleCheck}></input>
      <label className="custom-control-label" htmlFor="micLock" style={{marginLeft:"8px"}}> Lock Microphone</label>
      </div>
      <select
        className="form-control"
        style={{ width: "100%" }}
        value={nextMicSource}
        onChange={e => setNextMicSource(e.target.value)}
      >
        <option value={"None"} disabled label="Choose a microphone"></option>
        {
          micList.map(function(e,i) {
            return <option value={e.deviceId} key={i}>{e.label !== "" ? e.label : e.deviceId}</option>;
          })
        }
      </select>
      <button disabled={!state.open} onClick={() => dispatch(MixerState.startMicCalibration())}>
        Calibrate Trim
      </button>
      {state.openError !== null && (
        <div className="sp-alert">
          {state.openError === "NO_PERMISSION"
            ? "Please grant this page permission to use your microphone and try again."
            : state.openError === "NOT_SECURE_CONTEXT"
            ? "We can't open the microphone. Please make sure the address bar has a https:// at the start and try again."
            : "An error occurred when opening the microphone. Please try again."}
        </div>
      )}
      <div className="sp-mixer-buttons">
        <div
          className="sp-mixer-buttons-backdrop"
          style={{
            width: (USE_REAL_GAIN_VALUE ? state.gain : state.volume) * 100 + "%"
          }}
        ></div>
        <button onClick={() => dispatch(MixerState.setMicVolume("off"))}>
          Off
        </button>
        <button onClick={() => dispatch(MixerState.setMicVolume("full"))}>
          Full
        </button>
      </div>
    </div>
  );
}

function incrReducer(state: number, action: any) {
  return state + 1;
}

const Showplanner: React.FC<{ timeslotId: number }> = function({ timeslotId }) {
  const {
    plan: showplan,
    planLoadError,
    planLoading,
    planSaveError,
    planSaving
  } = useSelector((state: RootState) => state.showplan);

  const dispatch = useDispatch();

  useBeforeunload(event => event.preventDefault());

  useEffect(() => {
    dispatch(getShowplan(timeslotId));
  }, [dispatch, timeslotId]);



  function toggleSidebar() {
    var element = document.getElementById("sidebar");
    if (element) {
      element.classList.toggle("active");
    }
    setTimeout(function () {dispatch(MixerState.redrawWavesurfers())}, 500);
  }

  const [insertIndex, increment] = useReducer(incrReducer, 0);

  async function onDragEnd(result: DropResult, provider: ResponderProvided) {
    if (!result.destination) {
      return;
    }
    if (result.destination.droppableId[0] === "$") {
      // pseudo-channel
      return;
    }
    if (result.draggableId[0] === "T") {
      // this is a track from the CML
      // TODO: this is ugly, should be in redux
      const data = CML_CACHE[result.draggableId];
      const newItem: TimeslotItem = {
        type: "central",
        timeslotitemid: "I" + insertIndex,
        channel: parseInt(result.destination.droppableId, 10),
        weight: result.destination.index,
        ...data
      };
      dispatch(addItem(timeslotId, newItem));
      increment(null);
    } else if (result.draggableId[0] === "A") {
      // this is an aux resource
      // TODO: this is ugly, should be in redux
      const data = AUX_CACHE[result.draggableId];
      const newItem: TimeslotItem = {
        type: "aux",
        timeslotitemid: "I" + insertIndex,
        channel: parseInt(result.destination.droppableId, 10),
        weight: result.destination.index,
        clean: true,
        ...data
      };
      dispatch(addItem(timeslotId, newItem));
      increment(null);
    } else {
      // this is a normal move (ghosts aren't draggable)
      dispatch(
        moveItem(timeslotId, result.draggableId, [
          parseInt(result.destination.droppableId, 10),
          result.destination.index
        ])
      );
    }
  }

  async function onCtxRemoveClick(e: any, data: { id: string }) {
    dispatch(removeItem(timeslotId, data.id));
  }

  if (showplan === null) {
    return (
      <div className="sp-container">
        <h1>Getting show plan...</h1>
        {planLoading && (
          <b>Your plan is loading, please wait just a second...</b>
        )}
        {planLoadError !== null && (
          <>
            <b>Plan load failed!</b> Please tell Comp that something broke.
            <p>
              <code>{planLoadError}</code>
            </p>
          </>
        )}
      </div>
    );
  }
  return (
    <div className="sp-container m-0">
      <CombinedNavAlertBar />
      <div className="sp-status">
        {planSaving && <em>Plan saving...</em>}
        {planSaveError && (
          <b>
            Catastrophe! <code>{planSaveError}</code>
          </b>
        )}
      </div>
      <div className="sp">
        <DragDropContext onDragEnd={onDragEnd}>
          <Column id={0} data={showplan} />
          <Column id={1} data={showplan} />
          <Column id={2} data={showplan} />
          <div className="sp-main-col sidebar-toggle">
            <span
              id="sidebarCollapse"
              className="btn btn-outline-dark btn-sm mb-0"
              onClick={() => toggleSidebar()}
            >
              <i className="fas fa-align-justify mb-2"></i>Toggle Sidebar
            </span>
          </div>
          <div id="sidebar" className="sp-main-col">
            <LibraryColumn />
            <MicControl />
          </div>
        </DragDropContext>
      </div>
      <ContextMenu id={TS_ITEM_MENU_ID}>
        <MenuItem onClick={onCtxRemoveClick}>Remove</MenuItem>
      </ContextMenu>
      <MicCalibrationModal />
    </div>
  );
};

export default Showplanner;
