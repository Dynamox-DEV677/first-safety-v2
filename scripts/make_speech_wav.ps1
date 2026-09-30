# Makes the test sentence the voice QA feeds Chrome's fake microphone (Windows speech synthesis).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/make_speech_wav.ps1 [out.wav]
param([string]$Out = "qa-shots/speech.wav")
Add-Type -AssemblyName System.Speech
$dir = Split-Path -Parent $Out
if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(48000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$s.SetOutputToWaveFile((Resolve-Path -LiteralPath (Split-Path -Parent $Out)).Path + "\" + (Split-Path -Leaf $Out), $fmt)
$s.Rate = -1
$s.Speak("A street dog bit my hand and it is bleeding.")
$s.Dispose()
Write-Output "wrote $Out"
