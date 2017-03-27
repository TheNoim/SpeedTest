#!/usr/bin/env bash
cd submodules/pyinstaller/bootloader
python ./waf distclean all
cd ..
python setup.py install
cd ../clispeedtest
pyinstaller -F speedtest.py