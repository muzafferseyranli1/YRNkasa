package com.yrn.kasa;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeOcrPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
