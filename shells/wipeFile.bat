@echo Wipe All File And Folder
@echo %*
@echo Are You Sure?
@pause

@node ../modules/wipeFile.mjs %*
@pause