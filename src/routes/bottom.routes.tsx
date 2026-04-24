import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Onboarding from '../pages/auth/onboarding/onboarding';
import InputPhoneNumber from '../pages/auth/withNumber/withNumber';
import VerifycationNumber from '../pages/auth/verifycationNumer/verification';
import ClientRegister from '../pages/client/clientRegister/clientRegister/clientRegister';
import ChoiceMode from '../pages/auth/UserMode/userMode';
import DeliverRegister from '../pages/deliver/deliverRegister/screenOne/one';
import DeliverRegisterTwo from '../pages/deliver/deliverRegister/screenTwo/two';
import DeliverRegisterThree from '../pages/deliver/deliverRegister/screenThree/three';
import DeliverRegisterFour from '../pages/deliver/deliverRegister/screenFour/four';

const Tab = createBottomTabNavigator();

export default function BottomRoutes() {
    return (
            <Tab.Navigator
            >
                <Tab.Screen
                    name="Onboarding"
                    component={Onboarding}
                />
                <Tab.Screen
                    name="InputPhoneNumber"
                    component={InputPhoneNumber}
                />
            </Tab.Navigator>
    );
}