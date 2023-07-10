//const { getInput, setOutput, setFailed } = require("@actions/core");
import { getInput, setOutput, setFailed } from "@actions/core";
//const { get } = require('axios');
import axios from 'axios';
//const { ItentialSDK } = require('ea-utils/sdk.js');
import { ItentialSDK } from "ea-utils/sdk.js";

async function run() {

  //test variables
  /*const iap_token = 'Yjc3Y2E5MDIwYTM5MDQzNDE2YTJjM2M4ZDFlMWQ1ZWU=';
  const time_interval = 15;
  const no_of_attempts = 10 ;
  const automation_id = '1586c4006b9f404cb491ed41';
  let iap_instance = 'https://itential-se-poc-stg-221.trial.itential.io/';
  if (iap_instance.endsWith('/'))
    iap_instance = iap_instance.substring(0, iap_instance.length - 1);
  */

  const iap_token = getInput("iap_token");
  const time_interval = getInput("time_interval");
  const no_of_attempts = getInput("no_of_attempts");
  const automation_id = getInput("automation_id");
  let iap_instance = getInput("iap_instance");
  if (iap_instance.endsWith('/'))
    iap_instance = iap_instance.substring(0, iap_instance.length - 1);
  
  let count = 0;

  //using the ea-utils library
  const user = [
    {
      hostname: iap_instance,
      username: '',
      password: '',
      token: iap_token
    }
  ]

  const authentication = new ItentialSDK.Authentication(user); 
  const opsManager = new ItentialSDK.OperationsManagerAPI(iap_instance, iap_token, authentication);

  try {
   //check the status of the automation and return the output (IAP release <= 2021.1)
    const automationStatus211 = (automation_id) => {
      axios
      .get(
        `${iap_instance}/workflow_engine/job/${automation_id}/details?token=` +
          iap_token
      )
        .then((res) => {
          console.log("Automation Status: ", res.data.status);
          if (res.data.status === "running" && count < no_of_attempts) {
            setTimeout(() => {
              count += 1;
              automationStatus211(automation_id);
            }, time_interval * 1000);
          } else if (res.data.status === "complete") {
            axios
            .get(
              `${iap_instance}/workflow_engine/job/${automation_id}/output?token=` +
                iap_token
            )
              .then((res) => {
                setOutput("results", res.data.variables);
              })
              .catch((err) => {
                setFailed(err.response.data);
              });
          } else if (res.data.status === "canceled") {
            setFailed("Automation Canceled");
          } else if (res.data.status === "error") {
            setFailed(res.data.error);
          } else {
            setFailed(
              'Automation Timed out based upon user defined time_interval and no_of_attempts'
            );
          }
        })
        .catch((err) => {
          setFailed(err.response.data);
        });
    };
    
    //check the status of the automation and return the output (IAP release > 2021.1)
    const automationStatus221 = (automation_id) => {

      opsManager.getJobResult(automation_id, (res,err) => {
        console.log("Running the integrated library");
        if (err){
          if (typeof err === "string") {
            setFailed(err);
          } else {
            setFailed(err.response.data);
          }
        } else {
          console.log("Automation Status: ", res.status);
          if (res.status === "running" && count < no_of_attempts) {
            console.log("count: ", count);
            setTimeout(() => {
              count += 1;
              automationStatus221(automation_id);
            }, time_interval * 1000);
          } else if (res.status === "complete") {
            setOutput("results", res.variables);
          } else if (res.status === "canceled") {
            setFailed("Automation Canceled");
          } else if (res.status === "error") {
            setFailed(res.error);
          } else {
            setFailed(
              'Automation Timed out based upon user defined time_interval and no_of_attempts'
            );
          }

        }
      })
    };

    //start the automation on GitHub event
    const startAutomation = () => {
      axios
      .get(`${iap_instance}/health/server?token=` + iap_token)
        .then((res) => {
          const release = res.data.release.substring(
            0,
            res.data.release.lastIndexOf(".")
          );
          if (Number(release) <= 2021.1) automationStatus211(automation_id);
          else automationStatus221(automation_id);
        })
        .catch((err) => {
          setFailed(err);
        });
    };
    startAutomation();

  } catch (e) {
    setFailed(e);
  }
}

run();
