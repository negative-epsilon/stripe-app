import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View, Button, Pressable, Platform } from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { initStripe, useStripe } from '@stripe/stripe-react-native';
import GooglePayMark from './GooglePayMark';
import ApplePayMark from './ApplePayMark';

const ProductRow = ({ product, cart, setCart }) => {
    const modifyCart = (delta) => {
        setCart({ ...cart, [product.id]: cart[product.id] + delta })
    }
    return (
        <View style={styles.productRow}>
            <View style={{ flexDirection: 'row' }}>
                <Text style={{ fontSize: 17, flexGrow: 1 }}>
                    {product.name} - {product.price}$
                </Text>
                <Text style={{ fontSize: 17, fontWeight: "700" }}>
                    {cart[product.id]}
                </Text>
            </View>
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 8
            }}>
                <Button
                    disabled={cart[product.id] <= 0}
                    title="Remove"
                    onPress={() => modifyCart(-1)} />
                <Button
                    title="Add"
                    onPress={() => modifyCart(1)} />
            </View>
        </View>
    )
}

const ProductsScreen = ({ products, navigateToCheckout }) => {
    /**
     * We will save the state of the cart here
     * It will have the inital shape:
     * {
     *  [product.id]: 0
     * }
     */
    const [cart, setCart] = React.useState(
        Object.fromEntries(products.map(p => [p.id, 0]))
    );

    const handleContinuePress = async () => {
        /* Send the cart to the server */
        // const URL = 'https://domain.tld/api/create-payment-intent'
        // const response = await fetch(URL, {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application-json'
        //     },
        //     body: JSON.stringify(cart)
        // })

        /* Await the response */
        // const {
        //     publishableKey,
        //     stripeAccountId,
        //     clientSecret,
        //     merchantName
        // } = await response.json();

        const {
            publishableKey,
            stripeAccountId,
            clientSecret,
            merchantName
        } = {
            publishableKey: '',
            stripeAccountId: '',
            clientSecret: '',
            merchantName: ''
        }

        /* Navigate to the CheckoutScreen */
        /* You can use navigation.navigate from react-navigation */
        navigateToCheckout({
            publishableKey,
            stripeAccountId,
            clientSecret,
            merchantName,
            cart,
            products
        });
    }

    return (
        <View style={styles.screen}>
            {
                products.map((p) => {
                    return <ProductRow
                        key={p.id}
                        product={p}
                        cart={cart}
                        setCart={setCart} />
                })
            }
            <View style={{ marginTop: 16 }}>
                <Button title="Continue" onPress={handleContinuePress} />
            </View>
        </View>
    )
}

/**
 * CheckoutScreen related components
 */

const CartInfo = ({ products, cart }) => {
    return <View>
        {
            Object.keys(cart).map(productId => {
                const product = products.filter(p => p.id === productId)[0];
                const quantity = cart[productId];
                return (
                    <View
                        key={productId}
                        style={[{ flexDirection: 'row' }, styles.productRow]}>
                        <Text style={{ flexGrow: 1, fontSize: 17 }}>
                            {quantity} x {product.name}
                        </Text>
                        <Text style={{ fontWeight: "700", fontSize: 17 }}>
                            {quantity * product.price}$
                        </Text>
                    </View>
                )
            })
        }
    </View>
}

const MethodSelector = ({ onPress, paymentMethod }) => {
    // ...
    return (
        <View style={{ marginVertical: 48, width: '75%' }}>
            <Text style={{
                fontSize: 14,
                letterSpacing: 1.5,
                color: 'black',
                textTransform: 'uppercase'
            }}>
                Select payment method
            </Text>
            {/* If there's no paymentMethod selected, show the options */}
            {!paymentMethod &&
                <Pressable
                    onPress={onPress}
                    style={{
                        flexDirection: 'row',
                        paddingVertical: 8,
                        alignItems: 'center',
                    }}>
                    {
                        Platform.select({
                            ios: (<ApplePayMark height={59} />),
                            android: (<GooglePayMark height={59} />)
                        })
                    }

                    <View style={[styles.selectButton, { marginLeft: 16 }]}>
                        <Text style={[styles.boldText, { color: '#007DFF' }]}>Card</Text>
                    </View>
                </Pressable>
            }
            {/* If there's a paymentMethod selected, show it */}
            {!!paymentMethod &&
                <Pressable
                    onPress={choosePaymentOption}
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginHorizontal: 24,
                        paddingVertical: 8,
                    }}>
                    {paymentMethod.label.toLowerCase().includes('apple') &&
                        <ApplePayMark height={59} />
                    }
                    {paymentMethod.label.toLowerCase().includes('google') &&
                        <GooglePayMark height={59} />
                    }
                    {!paymentMethod.label.toLowerCase().includes('google') &&
                        !paymentMethod.label.toLowerCase().includes('apple') &&
                        <View style={[styles.selectButton, { marginLeft: 16 }]}>
                            <Text style={[styles.boldText, { color: '#007DFF' }]}>
                                {paymentMethod.label}
                            </Text>
                        </View>
                    }
                    <Text style={[styles.boldText, { color: '#007DFF' }]}>
                        Change payment method
                    </Text>
                </Pressable>
            }
        </View>
    )
}

const CheckoutScreen = ({
    products,
    navigateBack,
    publishableKey,
    stripeAccountId,
    clientSecret,
    merchantName,
    cart }) => {

    // We will store the selected paymentMethod
    const [paymentMethod, setPaymentMethod] = React.useState();

    // Import some stripe functions
    const {
        initPaymentSheet,
        presentPaymentSheet,
        confirmPaymentSheetPayment,
    } = useStripe();


    // Initialize stripe values upon mounting the screen
    React.useEffect(() => {
        (async () => {
            await initStripe({
                publishableKey,
                stripeAccountId,
                // Only if implementing applePay
                // Set the merchantIdentifier to the same
                // value in the StripeProvider and
                // striple plugin in app.json
                merchantIdentifier: 'yourMerchantIdentifier'
            });

            // Initialize the PaymentSheet with the paymentIntent data,
            // we will later present and confirm this
            await initializePaymentSheet();
        })
    }, []);

    const initializePaymentSheet = async () => {
        const { error, paymentOption } = await initPaymentSheet({
            paymentIntentClientSecret: clientSecret,
            customFlow: true,
            merchantDisplayName: merchantName,
            style: 'alwaysDark', // If darkMode
            googlePay: true, // If implementing googlePay
            applePay: true, // If implementing applePay
            merchantCountryCode: 'ES', // Countrycode of the merchant
            testEnv: __DEV__, // Set this flag if it's a test environment
        });
        if (error) {
            console.log(error)
        } else {
            // Upon initializing if there's a paymentOption
            // of choice it will be filled by default
            setPaymentMethod(paymentOption);
        }
    };

    const handleSelectMethod = async () => {
        const { error, paymentOption } = await presentPaymentSheet({
            confirmPayment: false,
        });
        if (error) {
            alert(`Error code: ${error.code}`, error.message);
        }
        setPaymentMethod(paymentOption);
    }

    const handleBuyPress = async () => {
        if (paymentMethod) {
            const response = await confirmPaymentSheetPayment();
    
            if (response.error) {
                alert(`Error ${response.error.code}`);
                console.error(response.error.message);
            } else {
                alert('Purchase completed!');
            }
        }
    }

    return (
        <View style={styles.screen}>
            <CartInfo cart={cart} products={products} />
            <MethodSelector
                onPress={handleSelectMethod}
                paymentMethod={paymentMethod}
            />
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignSelf: 'stretch',
                marginHorizontal: 24,
            }}>
                <Pressable onPress={navigateBack}>
                    <Text style={[styles.textButton, styles.boldText]}>
                        Back
                    </Text>
                </Pressable>
                <Pressable style={styles.buyButton} onPress={handleBuyPress}>
                    <Text
                        style={[styles.boldText, { color: 'white'}]}>
                        Buy
                    </Text>
                </Pressable>
                
            </View>
        </View>
    )
}

const AppContent = () => {
    const products = [{
        price: 10,
        name: 'Pizza Pepperoni',
        id: 'pizza-pepperoni',
    }, {
        price: 12,
        name: 'Pizza 4 Fromaggi',
        id: 'pizza-fromaggi'
    }, {
        price: 8,
        name: 'Pizza BBQ',
        id: 'pizza-bbq'
    }]

    const [screenProps, setScreenProps] = React.useState(null);

    const navigateToCheckout = (screenProps) => {
        setScreenProps(screenProps)
    }

    const navigateBack = () => {
        setScreenProps(null);
    }

    return (
        <View style={styles.container}>
            {!screenProps &&
                <ProductsScreen
                    products={products}
                    navigateToCheckout={navigateToCheckout} />
            }
            {!!screenProps &&
                <CheckoutScreen
                    {...screenProps}
                    navigateBack={navigateBack} />
            }
        </View>
    )
}

export default function App() {
    return (
        <StripeProvider>
            <AppContent />
        </StripeProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    screen: {
        alignSelf: 'stretch',
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    productRow: {
        paddingVertical: 24,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        width: '75%',
    },
    buyButton: {
        backgroundColor: '#007DFF',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 8,
    },
    textButton: {
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 8,
        color: '#007DFF'
    },
    selectButton: {
        borderColor: '#007DFF',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 8,
        borderWidth: 2,
    },
    boldText: {
        fontSize: 17,
        fontWeight: '700'
    }
});
