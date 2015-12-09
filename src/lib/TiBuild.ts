import * as vscode from 'vscode';
var path =require('path');
var shell = require('shelljs');
var project_flag = ' --project-dir "' + vscode.workspace.rootPath +'"';
var info;
shell.exec("ti info -o json -t android,ios", function(code, output) {
  console.log("activated")
  info = JSON.parse(output);
});

function getProjectConfig() {
  return new Promise((resolve, reject) => {
    shell.exec('ti project -o json' + project_flag, function(code, output) {
      if (code === 0) {
        resolve(JSON.parse(output));
      } else {
        console.log(output);
        reject(output);
      }
    })
  });
}
export enum BuildOption {
  Normal = 0,
  Shadow = 1,
  Appify = 2
}
var extra_flags_map = {
  [BuildOption.Normal] : "",
  [BuildOption.Shadow] : " --shadow",
  [BuildOption.Appify] : " --appify",
}
export class TiBuild {
  private type: BuildOption;
  private tiapp: Object;

  constructor(type: BuildOption = BuildOption.Normal) {
    this.type = type;
  }

  private executeTiCommand(c:string) {
    console.log(info);
    let channel = vscode.window.createOutputChannel("titanium");
    let command = 'cd "' +  vscode.workspace.rootPath + '" && ' +
                  'ti ' + c + project_flag
                  + ' -s ' + this.tiapp['sdk-version']
                  + extra_flags_map[this.type];
    console.log(command);
    var ti_command = shell.exec(command, {async: true});
    ti_command.stdout.on('data', function(data) {
      channel.append(data);
    });
    ti_command.stderr.on('data', function(data) {
      channel.append(data);
    });
    return vscode.commands.executeCommand("workbench.action.splitEditor")
    .then(() => channel.show())
  }
  private launchAndroidSim(selected?) {
    if (selected) {
      return this.executeTiCommand('build -p android -T simulator -C "' + selected + '"');
    }
    if (info.android.emulators.length === 0) {
      return vscode.window.showErrorMessage("No Android Emulators Configured");
    }
    if (info.android.emulators.length === 1) {
      return this.launchAndroidSim(info.android.emulators[0].id)
    }
    return vscode.window.showQuickPick(info.android.emulators.map(a => a.name))
    .then(s => this.launchAndroidSim(info.android.emulators.find(a => a.name === s).id))
  }

  private launchIosSim(family, selected?) {
    if (selected) {
      return this.executeTiCommand('build -p ios -F '+ family + ' -T simulator -C "' + selected + '"');
    }
    var simulators = Object
    .keys(info.ios.simulators.ios)
    .reduce((acc, ver) => acc.concat(info.ios.simulators.ios[ver]),[])
    .filter(o => o.family === family);

    if (simulators.length === 0) {
      return vscode.window.showErrorMessage("No Ios simulators found");
    }
    if (simulators.length === 1) {
      return this.launchIosSim(family, simulators[0].udid);
    }
    return vscode.window.showQuickPick(simulators.map(a => a.name + " (" + a.version + ")"))
    .then(s => this.launchIosSim(family, simulators.find(a => a.name === s.split(" (")[0]).udid))
  }

  private launchSim(platform) {
    if (platform === "android") {
      return this.launchAndroidSim()
    }
    return this.launchIosSim(platform);
  }
  private launchIosDevice(profile_uuid, device?) {
    if (device) {
      return this.executeTiCommand('build -p ios  -T device -P "' + profile_uuid + '" -C "' + device + '"');
    }
    if (info.ios.devices.length === 0) {
      return this.launchIosDevice(profile_uuid, info.ios.device[0].udid)
    }
    return vscode.window.showQuickPick(info.ios.devices.map(a => a.name))
    .then(s => this.launchIosDevice(profile_uuid, info.ios.devices.find(a => a.name === s).udid))
  }

  private launchDevice(platform) {
    if (platform === "android") {
      return this.executeTiCommand('build -p android -T device');
    } else {
      var dev_profiles = info.ios.provisioning.development
      .filter(o => !o.expired && !o.invalid)
      .filter(o => this.tiapp['id'].indexOf(o.appId.replace(/\*/g,"")) !== -1)

      return vscode.window.showQuickPick(dev_profiles.map(a => a.uuid + " " + a.name))
     .then(s => {
       let profile = dev_profiles.find(a => a.uuid === s.split(" ")[0]);
       return this.launchIosDevice(profile.uuid);
     })
    }
  }

  private launchPlayStore() {
    var keystore_path, pass, keypass;
    return vscode.window.showInputBox({ prompt: "Enter keystore path:"})
    .then(_path => {
      keystore_path = path.resolve(vscode.workspace.rootPath,_path);
      console.log(keystore_path);
      return vscode.window.showInputBox({ prompt: "Enter keystore password:", password: true})
    })
    .then(_pass => {
      pass = _pass;
      return vscode.window.showInputBox({ prompt: "Enter key password:", password: true})
    })
    .then(_keypass => {
      keypass = _keypass;
      this.executeTiCommand('build -p android  -T dist-playstore '+
                                  ' -K ' + keystore_path +
                                  ' -O dist' +
                                  ' -P ' +  pass +
                                  ' --key-password ' + (keypass || pass));
    })
  }
  private launchIosDist(target) {
      var profiles = info.ios.provisioning[target.replace("dist-","")]
      .filter(o => !o.expired && !o.invalid)
      .filter(o => this.tiapp['id'].indexOf(o.appId.replace(/\*/g,"")) !== -1)
      return vscode.window.showQuickPick(profiles.map(a => a.uuid + " " + a.name))
     .then(s => {
       let profile = profiles.find(a => a.uuid === s.split(" ")[0]);
       return this.executeTiCommand('build -p ios  -T ' + target + ' -P "' + profile.uuid + '"' + ' -O dist');
     })
  }

  public launch() {
    var platform;
    var target;
    var device_id;
    return getProjectConfig()
    .then(_tiapp => {
      this.tiapp = _tiapp;
      var targets = Object.keys(this.tiapp["deployment-targets"]).filter(a=>this.tiapp["deployment-targets"][a]);
      return vscode.window.showQuickPick(targets)
    })
    .then((_platform) => {
      platform = _platform;
      return vscode.window.showQuickPick(["simulator", "device", ...(platform === "android" ? ["dist-playstore"] : ["dist-adhoc","dist-appstore"]) ])
    })
    .then(_target => {
      target = _target;
      if (target === "simulator") {
        return this.launchSim(platform)

      } else if (target ==="device") {
        return this.launchDevice(platform);
      } else if (target ==="dist-playstore") {
        return this.launchPlayStore();
      } else {
        return this.launchIosDist(target)
      }
    })
  }
  public clean() {
    return getProjectConfig()
    .then(_tiapp => {
      this.tiapp = _tiapp;
      return this.executeTiCommand('clean');
    });
  }

}