!macro customInstall
  ExecWait 'netsh advfirewall firewall add rule name="Videowaves Timer Remote Control" dir=in action=allow protocol=TCP localport=3030'
!macroend

!macro customUnInstall
  ExecWait 'netsh advfirewall firewall delete rule name="Videowaves Timer Remote Control"'
!macroend
