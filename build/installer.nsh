; Replace electron-builder's broad directory-prefix process matching. Keep
; failures distinct from "app running", including when PowerShell cannot run.
!macro customCheckAppRunning
  ; NSIS is 32-bit. Use native PowerShell so 64-bit Electron process paths
  ; remain readable instead of silently appearing empty through WOW64.
  IfFileExists "$WINDIR\Sysnative\WindowsPowerShell\v1.0\powershell.exe" 0 +2
  StrCpy $PowerShellPath "$WINDIR\Sysnative\WindowsPowerShell\v1.0\powershell.exe"
  InitPluginsDir
  File /oname=$PLUGINSDIR\media-center-install-check.ps1 "${BUILD_RESOURCES_DIR}\installer-processes.ps1"
  System::Call 'kernel32::GetCurrentProcessId() i.r4'
  StrCpy $R3 "Check"
  ${Do}
    nsExec::ExecToStack '"$PowerShellPath" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\media-center-install-check.ps1" -InstallDirectory "$INSTDIR" -ExecutableName "${APP_EXECUTABLE_FILENAME}" -Mode $R3 -InstallerPid $4'
    Pop $R0
    Pop $R2
    ${If} $R0 == 0
      ${ExitDo}
    ${ElseIf} $R0 == 10
      MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "Media Center is running from the selected installation folder. Close it to continue?" /SD IDOK IDOK +2
      Quit
      StrCpy $R3 "Close"
    ${Else}
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Setup could not prepare the installation folder. Close Media Center from its tray menu, check folder permissions, and retry.$\r$\n$\r$\n$R2" /SD IDCANCEL IDRETRY +2
      Quit
    ${EndIf}
  ${Loop}
  ClearErrors
!macroend
