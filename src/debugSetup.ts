import * as vscode from "vscode";
import * as path from "path";
import * as child_process from "child_process";
import { ServerDownloader } from "./serverDownloader";
import { correctScriptName, isOSUnixoid } from "./util/osUtils";
import { ServerSetupParams } from "./setupParams";

export async function registerDebugAdapter({ context, status, config, javaInstallation }: ServerSetupParams): Promise<void> {
    status.update("Registering Kotlin Debug Adapter...");
    
    // Prepare debug adapter
    const debugAdapterInstallDir = path.join(context.globalStorageUri.fsPath, "debugAdapterInstall");
    const customPath: string = config.get("debugAdapter.path");
    
    if (!customPath) {
        const debugAdapterDownloader = new ServerDownloader("Kotlin Debug Adapter", "kotlin-debug-adapter", "adapter.zip", debugAdapterInstallDir);
        
        try {
            await debugAdapterDownloader.downloadServerIfNeeded(status);
        } catch (error) {
            console.error(error);
            vscode.window.showWarningMessage(`Could not update/download Kotlin Debug Adapter: ${error}`);
            return;
        }
    }
    
    const startScriptPath = customPath || path.join(debugAdapterInstallDir, "adapter", "bin", correctScriptName("kotlin-debug-adapter"));
    
    // Ensure that start script can be executed
    if (isOSUnixoid()) {
        child_process.exec(`chmod +x ${startScriptPath}`);
    }

    let env: any = { ...process.env };

    if (javaInstallation.javaHome) {
        env['JAVA_HOME'] = javaInstallation.javaHome;
    }
    
    vscode.debug.registerDebugAdapterDescriptorFactory("kotlin", new KotlinDebugAdapterDescriptorFactory(startScriptPath, env));
}

/**
 * A factory that creates descriptors which point
 * to the Kotlin debug adapter start script.
 */
export class KotlinDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
    public constructor(
        private startScriptPath: string,
        private env?: any
    ) {}
    
    async createDebugAdapterDescriptor(session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): Promise<vscode.DebugAdapterDescriptor> {
        return new vscode.DebugAdapterExecutable(this.startScriptPath, null, {
            env: this.env
        });
    }
}
