import time
import smbus
import RPi.GPIO as GPIO

GPIO.setwarnings(False)

# Set GPIO mode
GPIO.setmode(GPIO.BCM)

# Set up GPIO pin 27 as input for the first button with a pull-down resistor
GPIO.setup(27, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

# Set up GPIO pin 22 as input for the second button with a pull-down resistor
GPIO.setup(22, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

# Set up GPIO pin 17 as output for the buzzer
GPIO.setup(17, GPIO.OUT)
GPIO.output(17, GPIO.LOW)  # Initialize buzzer state to quiet

# LCD class for displaying data on the LCD screen
class LCD_Contoller:
    def __init__(self, i2c_addr: int = 0x27, backlight: bool = True):

        # device constants
        self.I2C_ADDR = i2c_addr
        self.LCD_WIDTH = 16  # Max. characters per line

        self.LCD_CHR = 1  # Mode - Sending data
        self.LCD_CMD = 0  # Mode - Sending command

        self.LCD_LINE_1 = 0x80  # LCD RAM addr for line one
        self.LCD_LINE_2 = 0xC0  # LCD RAM addr for line two

        if backlight:
            # on
            self.LCD_BACKLIGHT = 0x08
        else:
            # off
            self.LCD_BACKLIGHT = 0x00

        self.ENABLE = 0b00000100  # Enable bit

        # Timing constants
        self.E_PULSE = 0.0005
        self.E_DELAY = 0.0005

        self.bus = smbus.SMBus(1)
        # Open I2C interface

        # Initialise display
        self.lcd_byte(0x33, self.LCD_CMD)  # 110011 Initialise
        self.lcd_byte(0x32, self.LCD_CMD)  # 110010 Initialise
        self.lcd_byte(0x06, self.LCD_CMD)  # 000110 Cursor move direction
        self.lcd_byte(0x0C, self.LCD_CMD)  # 001100 Display On,Cursor Off, Blink Off
        self.lcd_byte(0x28, self.LCD_CMD)  # 101000 Data length, number of lines, font size
        self.lcd_byte(0x01, self.LCD_CMD)  # 000001 Clear display

        # turn off LCD
        self.clear()

    def lcd_byte(self, bits: int, mode: int):
        # Send byte to data pins
        # bits = data
        # mode = 1 for data, 0 for command

        bits_high = mode | (bits & 0xF0) | self.LCD_BACKLIGHT
        bits_low = mode | ((bits << 4) & 0xF0) | self.LCD_BACKLIGHT

        # High bits
        self.bus.write_byte(self.I2C_ADDR, bits_high)
        self.toggle_enable(bits_high)

        # Low bits
        self.bus.write_byte(self.I2C_ADDR, bits_low)
        self.toggle_enable(bits_low)

    def toggle_enable(self, bits: int):
        time.sleep(self.E_DELAY)
        self.bus.write_byte(self.I2C_ADDR, (bits | self.ENABLE))
        time.sleep(self.E_PULSE)
        self.bus.write_byte(self.I2C_ADDR, (bits & ~self.ENABLE))
        time.sleep(self.E_DELAY)

    def clear(self):
        # clear LCD
        self.lcd_byte(0x01, self.LCD_CMD)

    def print_message(self, message):
        # Print a message on the LCD
        self.lcd_string(message, 1)

    def lcd_string(self, message, line):
        """ Send string to display """
        if line == 1:
            message = message.ljust(self.LCD_WIDTH, " ")
            self.lcd_byte(self.LCD_LINE_1, self.LCD_CMD)
        elif line == 2:
            message = message.ljust(self.LCD_WIDTH, " ")
            self.lcd_byte(self.LCD_LINE_2, self.LCD_CMD)

        for i in range(self.LCD_WIDTH):
            self.lcd_byte(ord(message[i]), self.LCD_CHR)
    
    def clear1(self):
        # Clear line 1
        self.lcd_string(" " * self.LCD_WIDTH, 1)

    def clear2(self):
        # Clear line 2
        self.lcd_string(" " * self.LCD_WIDTH, 2)

