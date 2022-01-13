import React from "react";
import Restore from "react-restore";
import { Configuration, PlaidApi, PlaidEnvironments, Products } from "plaid";
import { PlaidLink } from "react-plaid-link";

import link from "../../../../../../resources/link";
import svg from "../../../../../../resources/svg";

class Plaid extends React.Component {
  constructor(...args) {
    super(...args);
    this.moduleRef = React.createRef();
    this.resizeObserver = new ResizeObserver(() => {
      if (this.moduleRef && this.moduleRef.current) {
        link.send("tray:action", "updateAccountModule", this.props.moduleId, {
          height: this.moduleRef.current.clientHeight,
        });
      }
    });
    this.getBalance = this.getBalance.bind(this);
    this.onSuccess = this.onSuccess.bind(this);

    this.state = {
      expand: false,
      verifyAddressSuccess: false,
      verifyAddressResponse: "",
      linkToken: "",
      accessToken: "",
      balance: "",
      loadingBalance: false,
    };
  }

  verifyAddress() {
    link.rpc("verifyAddress", (err) => {
      if (err) {
        this.setState({
          verifyAddressSuccess: false,
          verifyAddressResponse: err,
        });
      } else {
        this.setState({
          verifyAddressSuccess: true,
          verifyAddressResponse: "Address matched!",
        });
      }
      setTimeout(() => {
        this.setState({
          verifyAddressSuccess: false,
          verifyAddressResponse: "",
        });
      }, 5000);
    });
  }

  getBalance(publicToken) {
    this.setState({ loadingBalance: true });
    this.plaidClient
      .itemPublicTokenExchange({ public_token: publicToken })
      .then((response) => {
        this.setState({ accessToken: response.data.access_token });

        this.plaidClient
          .accountsBalanceGet({ access_token: response.data.access_token })
          .then((response) => {
            console.log(response.data.accounts[0]);
            const { balances } = response.data.accounts[0];

            console.log(balances);
            this.setState({ balance: balances.current.toString() });
            this.setState({ loadingBalance: false });
          });
      });
  }

  getLinkToken() {
    const configuration = new Configuration({
      basePath: PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": "61df959e57475e001ae4e5b1",
          "PLAID-SECRET": "975d7b0f123330bf8c151f1415c405",
        },
      },
    });

    this.plaidClient = new PlaidApi(configuration);

    const request = {
      user: {
        client_user_id: "61df959e57475e001ae4e5b1",
      },
      client_name: "Plaid Test App",
      products: [Products.Auth, Products.Transactions],
      country_codes: ["US"],
      language: "en",
      webhook: "https://sample-web-hook.com",
      redirect_uri: "https://domainname.com/oauth-page.html",
      account_filters: {
        depository: {
          account_subtypes: ["checking", "savings"],
        },
      },
    };

    this.plaidClient
      .linkTokenCreate(request)
      .then((response) => {
        console.log(response.data);
        this.setState({ linkToken: response.data.link_token });
      })
      .catch((err) => console.log(err));
  }

  onSuccess(public_token, metadata) {
    this.getBalance(public_token);
  }

  componentDidMount() {
    this.resizeObserver.observe(this.moduleRef.current);

    this.getLinkToken();
  }

  render() {
    const signerType = this.store(
      "main.accounts",
      this.props.id,
      "lastSignerType"
    );
    const signerKind =
      signerType === "seed" || signerType === "ring" ? "hot" : "device";
    const account = this.store("main.accounts", this.props.id);
    return (
      <div ref={this.moduleRef} className="balancesBlock">
        <div>
          <div className="moduleHeader">{"Verify Plaid"}</div>
          <div className="moduleMain">
            {this.state.loadingBalance && (
              <div className="signerVerifyText">
                <div className="loader" />
              </div>
            )}
            {this.state.balance ? (
              <div className="signerVerifyText">
                {`balance: ${this.state.balance}`}
              </div>
            ) : (
              <div>
                {!this.state.loadingBalance && (
                  <div>
                    <div className="signerVerifyText">
                      Verify user's bank account
                    </div>
                    {this.state.linkToken && (
                      <PlaidLink
                        style={{
                          backgroundColor: "transparent",
                          border: 0,
                          width: "100%",
                        }}
                        token={this.state.linkToken}
                        onSuccess={this.onSuccess}
                      >
                        <div className="moduleButton">Verify Plaid</div>
                      </PlaidLink>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default Restore.connect(Plaid);
