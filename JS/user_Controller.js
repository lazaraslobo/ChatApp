var app = angular.module('user_Controller', ['ngMaterial', 'ngMessages', 'toastr', "ngRoute", "ngCookies"]);
//Routing
app.config(function ($routeProvider) {
    $routeProvider
        .when("/", {
            templateUrl: "Login.html",
            controller: 'MainController'
        })
        .when("/Dashboard", {
            templateUrl: 'Dashboard.html'
        }).otherwise({
            redirectTo: "/",
        });
});

//BEGIN CONTROLLER
app.controller('MainController', function ($scope, $rootScope, toastr, $http, $location, $cookies) {
    var mainCtrl = this;

    //Socket URL
    var socketUrl = io.connect("http://localhost:8080");
    // mainCtrl.isUserLoggedIn = true;
    //Existing user names list
    $scope.existUserNames = [];
    $scope.currentUserData = {};
    $scope.currentChatDetails = {};
    // $scope.currentUserData = { "user_name": "mittu", "user_id": 16 };
    $scope.activeUsers = [];
    mainCtrl.msgSentTo = {};

    //To whom the message is received
    mainCtrl.messageReceived = {
        "from": '',
        "message": []
    };

    //Socket message details
    mainCtrl.messageDetails = [];
    //Node js server port
    const serverUrl = "http://localhost:8080/";

    //onload lead the usernames
    angular.element(document).ready(function () {
        mainCtrl.commonGetUserNames();
        // mainCtrl.getParticularUserAllData(1);
        mainCtrl.getActiveUsers();
        // mainCtrl.getLoginData("mithun");
        // mainCtrl.getLoginData("lazaras");

        //Check the cookie is exists on the browser or not
        var cookieDataTemp = $cookies.get("myChatApp");
        if (cookieDataTemp != undefined) {
            //if exists go to dashboard with using cooking uname
            var cookieData = JSON.parse(cookieDataTemp);
            // console.log(cookieData);
            //pass the cookie uname
            mainCtrl.getLoginData(cookieData.user_name);
            //update the user as active user
            mainCtrl.updateActiveStatus(cookieData.user_id, 1);
        }
        // mainCtrl.updateActiveStatus();
    });

    mainCtrl.updateActiveStatus = function (user_id, activeStatus) {
        $http({
            method: 'POST',
            url: serverUrl + 'updateActiveStatus',
            data: { "user_id": user_id, "status": activeStatus }
        }).then(function (response) {
            // console.log(response);
        }, function (error) {
            console.log(error);
        });
    }
    
    //Get the already existing userNames
    mainCtrl.commonGetUserNames = function () {
        $http({
            method: 'GET',
            url: serverUrl + 'getUserNames'
        }).then(function (response) {
            if (response.data != null) {
                response.data.forEach(eachUserName => {
                    $scope.existUserNames.push(eachUserName.user_name);
                });
                // console.log($scope.existUserNames);
            }
        }, function (error) {
            console.log(error);
        });
    }

    // mainCtrl.startSession = function () {
    //     Session.then(function (response) {
    //         $rootScope.session = response;
    //     });
    // }

    //When new user created.
    mainCtrl.startChat = function (newUserName) {
        $http({
            url: serverUrl + 'newChat',
            method: 'POST',
            data: { "user_name": newUserName }
        }).then(function (response) {
            // if (response.data != null) {
            // console.log(response.data);
            $scope.currentUserData["user_name"] = newUserName;
            $scope.currentUserData["user_id"] = response.data;

            //Store the new user in cookie
            var cookieobj = {
                "user_id": response.data,
                "user_name": newUserName
            }
            $cookies.put("myChatApp", JSON.stringify(cookieobj));

            // $scope.$applyAsync();
            // console.log("user not exist", $scope.currentUserData);
            mainCtrl.commonGetUserNames();
            // mainCtrl.getParticularUserAllData(response.data);
            //redirect to dashboard
            $location.path("/Dashboard");
            //put the new logged in user in all the users dashboard active panel
            socketUrl.emit("userLoggedIn", {});

            // $scope.$apply();
            // }
        }, function (error) {
            console.log(error);
        });
    }

    //Get the user details from login
    mainCtrl.getLoginData = function (userName) {
        $http({
            url: serverUrl + 'getUserLoginData',
            method: 'POST',
            data: { "user_name": userName }
        }).then(function (response) {
            // console.log("uname =>", response)
            if (response.data != '') {
                //Store it in the cookie
                var cookieobj = {
                    "user_id": response.data[0].user_id,
                    "user_name": response.data[0].user_name
                }
                $cookies.put("myChatApp", JSON.stringify(cookieobj));

                $scope.currentUserData["user_name"] = response.data[0].user_name;
                $scope.currentUserData["user_id"] = response.data[0].user_id;
                $scope.$applyAsync();
                // console.log("getLoginData() ", $scope.currentUserData);

                //Get the particular user data
                mainCtrl.getParticularUserAllData(response.data[0].user_id);

                //Update the user statusa
                mainCtrl.updateActiveStatus(response.data[0].user_id, 1);
            }

            //Navigate to dahsboard
            $location.path("/Dashboard");
            socketUrl.emit("userLoggedIn", {});
        }, function (error) {
            console.log(error);
        });
        // $scope.$apply();
    }

    //User logout
    mainCtrl.userLogout = function () {
        //get the name from cookie and delete the cookie and pass the data to change the active status
        var cokieData = JSON.parse($cookies.get("myChatApp"));
        $cookies.remove("myChatApp");
        mainCtrl.updateActiveStatus(cokieData.user_id, 0);
        
        //Put the user as offline in all users left panel
        socketUrl.emit("userLoggedOut", {});
        $location.path("/");
    }

    //Get all the messages of particular user.
    mainCtrl.getParticularUserAllData = function (user_id) {
        // console.log("ID is => " + user_id);
        $http({
            url: serverUrl + 'getPaticularUserData',
            method: 'POST',
            data: { "user_id": user_id }
        }).then(function (response) {
            // console.log("Then ID is => ", response);
            // if (response.data != null) {
            if (response.data != '') {
                // var receivers = {};
                //Common function to create user object details
                mainCtrl.createUserDataObject(response);
            }
            // }
        }, function (error) {
            console.log(error);
        });
    }

    //Common function to create User object
    mainCtrl.createUserDataObject = function (userObj) {
        // console.log("Obj is =>", userObj);

        userObj.data.forEach(eachRow => {
            var tempId = eachRow.receiver_id;
            mainCtrl.msgSentTo[tempId] = [];
        });
        userObj.data.forEach(eachRow => {
            var tempId = eachRow.receiver_id;
            // var tempId = eachRow.receiver_id;
            mainCtrl.msgSentTo[tempId].push({ "message": eachRow.msg_body });
            // console.log(receivers);
        });
        // console.log("Message sent info ", mainCtrl.msgSentTo)
    }

    //Get the list of active users
    mainCtrl.getActiveUsers = function () {
        $http({
            url: serverUrl + 'getActiveUsers',
            method: 'GET'
        }).then(function (response) {
            $scope.activeUsers = response.data;
        }, function (error) {
            console.log(error);
        });
    }

    //New message from user
    mainCtrl.userMessage = function (msgSendTo, messageText) {
        // $('#message_text').empty();
        socketUrl.emit("chatWithUser", {
            sendTo: msgSendTo,
            msgBody: messageText,
            from: $scope.currentUserData["user_id"]
        });


        // if (Object.keys(mainCtrl.msgSentTo).indexOf("" + msgSendTo) == -1) {
        //     mainCtrl.msgSentTo[msgSendTo] = [];
        // }
        // mainCtrl.msgSentTo[msgSendTo].push({ "message": messageText });

        // $http({
        //     url: serverUrl + 'sendNewMessage',
        //     method: 'POST',
        //     data: { "sendTo": msgSendTo, "loggedInUserId": $scope.currentUserData["user_id"], "message": messageText }
        // }).then(function (response) {
        //     // $scope.activeUsers = response.data;
        //     console.log(response);
        //     var objKeys = Object.keys(mainCtrl.msgSentTo);
        //     var receiv_id = "" + msgSendTo;
        //     if (objKeys.indexOf(receiv_id) == -1) {
        //         mainCtrl.msgSentTo[receiv_id] = [{ "message": messageText }];
        //         console.log("index doestnt");
        //     } else {
        //         console.log("index exists");
        //         mainCtrl.msgSentTo[receiv_id].push({ "message": messageText });

        //     }
        // }, function (error) {
        //     console.log(error);
        // });

    }
    //Response back from socker node js.
    socketUrl.on("chatWithUser", function (data) {
        mainCtrl.messageDetails = data;
        // if (Object.keys(mainCtrl.messageReceived[curr_id]).indexOf("" + sendTo) == -1) {
        //     mainCtrl.messageReceived[curr_id][sendTo] = [];
        // }
        // mainCtrl.messageReceived[curr_id][sendTo].push(msg);
        // mainCtrl.messageReceived["from"] = data.from;
        // mainCtrl.messageReceived["message"].push(data.msgBody);
        $scope.$apply();
    });

    //When a user logouts make him invisible in other sockets
    socketUrl.on("userLoggedOut", function (data) {
        mainCtrl.getActiveUsers();
    });

    //Make the user active in all other sockets in left panel
    socketUrl.on("userLoggedIn", function (data) {
        mainCtrl.getActiveUsers();
    });
});