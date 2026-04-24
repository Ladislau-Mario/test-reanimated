import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { themes } from '../../../global/themes';

export function ButtonResend() {
    const [timer, setTimer] = useState(30);
    const [disabled, setDisabled] = useState(true);

    useEffect(() => {
        let interval: any;
        if (timer > 0 && disabled) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else {
            setDisabled(false);
        }
        return () => clearInterval(interval);
    }, [timer, disabled]);

    const handleResend = () => {
        if (!disabled) {
            setTimer(30);
            setDisabled(true);
            console.log("Solicitando novo SMS...");
        }
    };

    return (
        <TouchableOpacity 
            onPress={handleResend}
            disabled={disabled}
            style={[styles.button, { opacity: disabled ? 0.5 : 1 }]}
        >
            <Text style={styles.text}>
                {disabled ? `Reenviar o código em 00:${timer < 10 ? `0${timer}` : timer}` : "Reenviar o código"}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        width: '100%',
        height: 56,
        backgroundColor: themes.colors.buttonGoogle1,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    text: {
        color: themes.colors.white,
        fontFamily: themes.fonts.poppinsRegular,
        fontSize: 18,
    }
});