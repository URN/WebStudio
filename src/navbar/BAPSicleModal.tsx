import React, { useState } from "react";
import { FaTimes } from "react-icons/fa";
import Modal from "react-modal";
import { useDispatch } from "react-redux";
import { Button } from "reactstrap";
import BAPSicleLogo from "../assets/images/bapsicle.png";
import { connectBAPSicle, disconnectBAPSicle } from "../bapsicle";

interface BAPSicleModalProps {
  isOpen: boolean;
  close: () => any;
}

export function BAPSicleModal(props: BAPSicleModalProps) {
  const [BAPSicleServer, setBAPSicleServer] = useState("ws://localhost:13501");
  const [connectType, setConnectType] = useState("Connect");
  const dispatch = useDispatch();
  return (
    <Modal isOpen={props.isOpen} onRequestClose={props.close}>
      <h1 className="d-inline">BAPSicle Server Configuration</h1>
      <Button
        onClick={props.close}
        className="float-right pt-1"
        color="primary"
      >
        <FaTimes />
      </Button>
      <hr className="mt-1 mb-3" />
      <img src={BAPSicleLogo} alt="BAPSicle Server Logo" />
      <input
        type="text"
        value={BAPSicleServer}
        className="form-control my-2"
        onChange={(s) => setBAPSicleServer(s.target.value)}
      />
      <input
        type="submit"
        value={connectType}
        className="btn btn-primary"
        onClick={() => {
          if (connectType === "Connect") {
            dispatch(connectBAPSicle(BAPSicleServer));
            setConnectType("Disconnect");
          } else {
            disconnectBAPSicle();
            setConnectType("Connect");
          }
          props.close();
        }}
      />
    </Modal>
  );
}
