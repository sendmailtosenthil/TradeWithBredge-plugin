# Welcome to Trade With Bredge
## Purpose
Bredge team has created open source plugin that reads zerodha cookie and watch for the calendar spread price difference. When the price reached, it will play the sound for making order.
Your browser and your machine will act as server and monitor the price.

## Issues
Any issues in the plugin, reach out via [Telegram](https://t.me/TradeWithBredge)

## How to set up (One time Process)?
# Video for set up
You can view the **video** [here](https://youtu.be/_UDUnPlqyCI)

# Text Instruction to set up
1. Open the link to download [TradeWithBredge-v1.zip](https://drive.google.com/file/d/13dM9l85VdlWOAyDu-oMjlJd8crnsWmWA/view?usp=sharing) file
2. Click on the download button
3. ![image](https://github.com/user-attachments/assets/61333038-e20e-4de0-9f59-848e26df8a6e)
4. Create folder called TradeWithBredge-plugin 
5. Unzip the zip file and store them in C:/TradeWithBredge-plugin
6. Open the chrome browser.
7. Click on three dots
8. ![image](https://github.com/user-attachments/assets/6192bca0-17a4-4ee1-b3b1-4e1c8c1d3f44)
9. Click on Extensions and click on Manage Extensions
10. ![image](https://github.com/user-attachments/assets/b86e25ee-8881-469a-8e6e-a442fbf6a60e)
11. Click on Developer Mode & should be turn on (Blue color)
12. ![image](https://github.com/user-attachments/assets/901eb84c-cfd7-4614-93ec-c93bf21395a7)
13. After Developer Mode is enabled, you will see Load Unpacked button available
14. ![image](https://github.com/user-attachments/assets/dc26a5eb-a250-435e-a1f2-8d390eb75d40)
15. Click Load unpacked button, select the folder C:/TradeWithBredge-plugin (Note: should not have any other folders inside this folder. When it has more folder then select that folder)
16. You see the extension
17. ![image](https://github.com/user-attachments/assets/bc40185b-bb53-4bc3-858e-eb644c4a4f6b)
18. Click on Extensions button on the browser & click on pin of Calender Spread Price Monitor (Pin should be in blue)
19. ![image](https://github.com/user-attachments/assets/23a002c2-08f0-4489-8662-20bc62e1bbf3)
20. Should be able to see C icon on the toolbar. Once you see it, your set up is completed
21. ![image](https://github.com/user-attachments/assets/7ad67a31-a451-4df1-9b39-81a946d82728)

## How to use the plugin for your price monitoring **Zerodha**?
1. Login to Zerodha and go to dashboard page.
2. Click on the plugin, will show a button open zerodha, click on it will open new window
3. ![image](https://github.com/user-attachments/assets/f2b2c1ea-b499-4589-86b7-0193f7ec1bfd)
4. You will see the below screen
5. ![image](https://github.com/user-attachments/assets/4873f41c-9f0d-42ec-8592-5417a6f83748)
6. Go to your zerodha and add the strike what you to enter. Example
7. ![image](https://github.com/user-attachments/assets/b783b8b4-9ae6-4fb2-92e4-b7d1927a7243)
8. Click on popout for charts
9. ![image](https://github.com/user-attachments/assets/3e447a20-0268-484a-872b-ecc8d2ab85a1)
10. Copy the last symbol and token. This will be your buy leg and sell leg
11. ![image](https://github.com/user-attachments/assets/408b23cb-209e-45d7-ba11-70a237f04003)
12. You can refer screenshot for your reference.
13. ![image](https://github.com/user-attachments/assets/5be86ff1-6801-4be9-ae56-cbc7ba494cc5)
14. Enter the difference between the legs & click on Alert Me button.
15. After click of Alert me, the text below 'Yet to Connect' will show the difference and threshold waiting for.
16. When price difference reached, you will hear the notification sound.

## How to use the plugin for your price monitoring **AngelOne**?
1. Click on the plugin, will show a button "Open AngelOne", click on it will open new window
 ![image](https://github.com/user-attachments/assets/aad42567-f309-4b4a-a028-c6b671f10818)
2. You can click on AngelOne apps ([Link](https://smartapi.angelbroking.com/signin#)) link to generate API key. Login to Angel One, click on My Profile -> My APIs -> Create App button -> After fill in details as below, click on Create App -> U can see the API key.
![image](https://github.com/user-attachments/assets/a44c141f-4bea-48a9-8f9e-def84641c9ac)
3. Provide your information like Angel one username, mpin (Not the password), API key and TOTP secret key.
![image](https://github.com/user-attachments/assets/b2462268-b9b7-4729-9c5b-556e0ab131f9)
![image](https://github.com/user-attachments/assets/0d4b82fb-1979-44ea-a122-fa17b6b3b880)
5. Click on Connect button
6. When the things are correct, it will show below message with your id 


## Release Notes
### Version 1.0
1. Support for Calendar Spread with dynamic depth level to reduce slippages

## Next Release Features
1. Support for placing orders automatically
2. Support for custom quantity for Buy and Sell Leg
3. Support for Other Brokers like Angel Broking, Upstox, etc.
