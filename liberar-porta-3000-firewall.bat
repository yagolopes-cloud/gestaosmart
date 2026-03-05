@echo off
chcp 65001 >nul
echo ========================================
echo   Liberar portas 3000, 5173 e 5174 no Firewall (Windows)
echo   Execute como ADMINISTRADOR (clique direito ^> Executar como administrador)
echo ========================================
echo.

:: Porta 3000
netsh advfirewall firewall delete rule name="Gestor Pedidos 3000" >nul 2>&1
netsh advfirewall firewall add rule name="Gestor Pedidos 3000" dir=in action=allow protocol=TCP localport=3000 profile=any
if %ERRORLEVEL% neq 0 (echo ERRO ao criar regra 3000. Execute como Administrador. & pause & exit /b 1)
echo OK: Porta 3000 liberada.

:: Porta 5173
netsh advfirewall firewall delete rule name="Gestor Pedidos 5173" >nul 2>&1
netsh advfirewall firewall add rule name="Gestor Pedidos 5173" dir=in action=allow protocol=TCP localport=5173 profile=any
if %ERRORLEVEL% neq 0 (echo ERRO ao criar regra 5173. Execute como Administrador. & pause & exit /b 1)
echo OK: Porta 5173 liberada.

:: Porta 5174 (acesso externo 170.84.146.147)
netsh advfirewall firewall delete rule name="Gestor Pedidos 5174" >nul 2>&1
netsh advfirewall firewall add rule name="Gestor Pedidos 5174" dir=in action=allow protocol=TCP localport=5174 profile=any
if %ERRORLEVEL% neq 0 (echo ERRO ao criar regra 5174. Execute como Administrador. & pause & exit /b 1)
echo OK: Porta 5174 liberada.
echo.

echo Acesso externo (MikroTik liberado): http://170.84.146.147:5174
echo.
pause
