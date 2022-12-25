import Decoder from "mode-s-decoder";
import AircraftStore from "mode-s-aircraft-store";
import LatLon, { Ned } from "geodesy/latlon-nvector-ellipsoidal";

import {
  AVR_WS,
  CAM_W,
  CAM_H,
  CAM_POS,
  CAM_BEARING,
  CAM_HFOV,
  CAM_VHOV,
  CAM_HORIZON_ANGLE,
} from "./config";

const FontSize = 30; //pixels
const FontSpacing = FontSize + 2;
const Font = `bold ${FontSize}px monospace`;

const MarkerSize = 50; //from center ie. W = MarkerSize * 2
const MarkerPointSize = 1; //same as above
const Calibrate = false; //show some calibartion markers (helpful for positiong the camera)
const Compass = true;
const RelativeDeg = false;
const HozDeg = 5.0; //Horizontal degrees markers
const VirDeg = 5.0; //Vertical degrees markers

const IS_NIGHT = new Date().getHours() > 16.0 || new Date().getHours() < 5.0;
const DEG = "°";

const FT_MTR = 3.281; //Feet to Meters

const store = new AircraftStore({
  timeout: 30000,
});

function calcDelta(msg) {
  // Calculate the altitude of the aircraft in meters
  let alt =
    msg.unit === Decoder.UNIT_FEET ? msg.altitude / FT_MTR : msg.altitude;

  // Create a LatLon object for the position of the aircraft
  let msgPos = new LatLon(msg.lat, msg.lng, alt);

  // Calculate the delta (distance and bearing) between the aircraft and the camera position
  let delta = CAM_POS.deltaTo(msgPos);

  // Calculate the elevation angle of the aircraft relative to the camera
  let elevation = delta.elevation - CAM_HORIZON_ANGLE;

  return {
    dist: delta.length,
    elevation: elevation,
    bearing: CAM_BEARING - delta.bearing,
  };
}

let DEBUG = true;

if (DEBUG) {
  let aircraft = {
    callsign: "FAKE01",
    altitude: 10000, // in feet
    lat: 41.9792,
    lng: -87.9044,
    unit: Decoder.UNIT_FEET,
  };

  setInterval(function () {
    let delta = calcDelta(aircraft);
    let distance = delta.dist;
    let bearing = delta.bearing;

    // Move the aircraft eastward at 500 feet per second
    aircraft.lat += 0.0005 * Math.cos((bearing * Math.PI) / 180);
    aircraft.lng += 0.0005 * Math.sin((bearing * Math.PI) / 180);

    // If the aircraft has moved more than 25 miles (400,000 feet), start over
    if (distance > 400000) {
      aircraft.lat = 41.9792;
      aircraft.lng = -87.9044;
    }

    store.addMessage(aircraft);
  }, 1000 / 30);
} else {
  StartAVR();
}

let canvas = document.getElementById("radar");
canvas.width = CAM_W;
canvas.height = CAM_H;
let ctx = canvas.getContext("2d");

// common vars
let hw = canvas.width / 2.0;
let hh = canvas.height / 2.0;
let hhfov = CAM_HFOV / 2.0;
let hvfov = CAM_VHOV / 2.0;

const fnDraw = function (ac) {
  // Calculate the delta (distance and bearing) between the aircraft and the camera position
  let delta = calcDelta(ac);

  // Calculate the x and y position of the aircraft on the canvas
  let dx = Math.min(
    canvas.width,
    Math.max(0.0, hw - hw * (delta.bearing / hhfov))
  );
  let dy = Math.min(
    canvas.width,
    Math.max(0.0, hh - hh * (delta.elevation / hvfov))
  );

  // Draw a rectangle around the aircraft on the canvas
  ctx.strokeRect(
    dx - MarkerSize,
    dy - MarkerSize,
    MarkerSize * 2,
    MarkerSize * 2
  );
  ctx.fillRect(
    dx - MarkerPointSize,
    dy - MarkerPointSize,
    MarkerPointSize * 2,
    MarkerPointSize * 2
  );

  // Draw the callsign of the aircraft below it
  let title = `${ac.callsign}`;
  let csSize = ctx.measureText(title);
  ctx.fillText(title, dx - csSize.width / 2.0, dy - MarkerSize - 5);

  // Draw horizontal and vertical degree markers
  if (Calibrate) {
    ctx.beginPath();
    ctx.moveTo(0, hh);
    ctx.lineTo(canvas.width, hh);
    ctx.moveTo(hw, 0);
    ctx.lineTo(hw, canvas.height);
    ctx.stroke();
  }

  for (let a = HozDeg; a < CAM_HFOV; a += HozDeg) {
    let dxa = Math.min(canvas.width, Math.max(0.0, hw - hw * (a / hhfov)));
    let dxb = Math.min(canvas.width, Math.max(0.0, hw - hw * (-a / hhfov)));
    ctx.beginPath();
    ctx.moveTo(dxa, hh - 10);
    ctx.lineTo(dxa, hh + 10);
    ctx.moveTo(dxb, hh - 10);
    ctx.lineTo(dxb, hh + 10);
    ctx.stroke();
  }

  for (let a = VirDeg; a < CAM_VHOV; a += VirDeg) {
    let dya = Math.min(canvas.height, Math.max(0.0, hh - hh * (a / hvfov)));
    let dyb = Math.min(canvas.height, Math.max(0.0, hh - hh * (-a / hvfov)));
    ctx.beginPath();
    ctx.moveTo(hw - 10, dya);
    ctx.lineTo(hw + 10, dya);
    ctx.moveTo(hw - 10, dyb);
    ctx.lineTo(hw + 10, dyb);
    ctx.stroke();
  }
};

const fnClear = function () {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

const fnRender = function () {
  fnClear();
  ctx.font = Font;
  ctx.fillStyle = IS_NIGHT ? "white" : "black";
  ctx.strokeStyle = IS_NIGHT ? "white" : "black";
  ctx.lineWidth = 1;
  let acList = store.getAircrafts();
  for (let ix in acList) {
    fnDraw(acList[ix]);
  }
  ctx.textAlign = "center";
  ctx.fillText(`${CAM_HFOV}${DEG}`, hw, hh + hhfov);
  ctx.fillText(`${-CAM_HFOV}${DEG}`, hw, hh - hhfov);
  ctx.textAlign = "left";
  ctx.fillText(`${CAM_VHOV}${DEG}`, hw + hhfov, hh - FontSize);
  ctx.textAlign = "right";
  ctx.fillText(`${-CAM_VHOV}${DEG}`, hw - hhfov, hh - FontSize);
};

setInterval(function () {
  fnRender();
}, 1000 / 30);
